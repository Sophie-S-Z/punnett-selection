-- W4 app-owned rating schema. Run once in the Supabase SQL editor as owner.
-- This creates no policies and does not alter any course table.
-- Direct API table access is revoked. Narrow RPCs enforce access and ownership.
begin;

create table public.punnett_images (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  data_url text not null check (octet_length(data_url) <= 3000000),
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/gif')),
  created_at timestamptz not null default now()
);

create table public.punnett_generations (
  id uuid primary key default gen_random_uuid(),
  image_id uuid not null unique references public.punnett_images(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  prompt text not null check (char_length(btrim(prompt)) between 1 and 2000),
  model text not null check (char_length(btrim(model)) between 1 and 100),
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index punnett_generations_owner_created_idx on public.punnett_generations(owner_id, created_at);

create table public.punnett_captions (
  id uuid primary key default gen_random_uuid(),
  generation_id uuid not null references public.punnett_generations(id) on delete cascade,
  image_id uuid not null references public.punnett_images(id) on delete cascade,
  content text not null check (char_length(btrim(content)) between 1 and 500),
  created_at timestamptz not null default now()
);
create index punnett_captions_image_idx on public.punnett_captions(image_id);
create index punnett_captions_created_idx on public.punnett_captions(created_at, id);

create table public.punnett_caption_votes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  caption_id uuid not null references public.punnett_captions(id) on delete cascade,
  vote smallint not null check (vote in (-1, 1)),
  created_at timestamptz not null default now(),
  unique (owner_id, caption_id)
);
create index punnett_votes_owner_created_idx on public.punnett_caption_votes(owner_id, created_at desc, id desc);

alter table public.punnett_images enable row level security;
alter table public.punnett_generations enable row level security;
alter table public.punnett_captions enable row level security;
alter table public.punnett_caption_votes enable row level security;
revoke all on table public.punnett_images, public.punnett_generations,
  public.punnett_captions, public.punnett_caption_votes from public, anon, authenticated;

create function public.punnett_create_generation(image_data_url text, prompt_input text, model_input text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
  image_id_value uuid;
  generation_id_value uuid;
  mime_value text;
  decoded bytea;
begin
  if caller is null then raise exception 'Authentication required.' using errcode = '42501'; end if;
  if image_data_url is null or octet_length(image_data_url) > 3000000
    or image_data_url !~ '^data:image/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$'
    or prompt_input is null or char_length(btrim(prompt_input)) not between 1 and 2000
    or model_input is null or char_length(btrim(model_input)) not between 1 and 100 then
    raise exception 'Invalid image, prompt, or model.' using errcode = '22023';
  end if;
  begin
    decoded := decode(split_part(image_data_url, ',', 2), 'base64');
  exception when others then
    raise exception 'Invalid image encoding.' using errcode = '22023';
  end;
  if octet_length(decoded) not between 1 and 2097152 then
    raise exception 'Image must be between 1 byte and 2 MiB.' using errcode = '22023';
  end if;
  -- Serialize quota checks for this owner. Pending and failed attempts count.
  perform pg_advisory_xact_lock(hashtextextended(caller::text, 0));
  if (select count(*) from public.punnett_generations
      where owner_id = caller and created_at >= now() - interval '24 hours') >= 10 then
    raise exception 'daily_limit: Ten generation attempts per 24 hours.' using errcode = '22023';
  end if;
  mime_value := split_part(split_part(image_data_url, ';', 1), ':', 2);
  insert into public.punnett_images(owner_id, data_url, mime_type)
    values (caller, image_data_url, mime_value) returning id into image_id_value;
  insert into public.punnett_generations(image_id, owner_id, prompt, model)
    values (image_id_value, caller, btrim(prompt_input), btrim(model_input)) returning id into generation_id_value;
  return jsonb_build_object('id', generation_id_value, 'image_id', image_id_value);
end;
$$;

create function public.punnett_complete_generation(generation_id_input uuid, captions_input jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
  generation public.punnett_generations%rowtype;
  caption_value jsonb;
  caption_text text;
  caption_id_value uuid;
  caption_results jsonb := '[]'::jsonb;
  seen_texts text[] := array[]::text[];
begin
  if caller is null then raise exception 'Authentication required.' using errcode = '42501'; end if;
  select * into generation from public.punnett_generations
    where id = generation_id_input and owner_id = caller for update;
  if not found or generation.status <> 'pending' then
    raise exception 'Generation is unavailable or already finalized.' using errcode = '22023';
  end if;
  if captions_input is null or jsonb_typeof(captions_input) <> 'array' then
    raise exception 'Captions must be an array.' using errcode = '22023';
  end if;
  if jsonb_array_length(captions_input) not between 2 and 10 then
    raise exception 'Provide between 2 and 10 captions.' using errcode = '22023';
  end if;
  for caption_value in select value from jsonb_array_elements(captions_input) loop
    if jsonb_typeof(caption_value) <> 'string' then
      raise exception 'Each caption must be text.' using errcode = '22023';
    end if;
    caption_text := btrim(caption_value #>> '{}');
    if char_length(caption_text) not between 1 and 500 or caption_text = any(seen_texts) then
      raise exception 'Caption is empty, too long, or repeated.' using errcode = '22023';
    end if;
    seen_texts := array_append(seen_texts, caption_text);
    insert into public.punnett_captions(generation_id, image_id, content)
      values (generation.id, generation.image_id, caption_text) returning id into caption_id_value;
    caption_results := caption_results || jsonb_build_array(jsonb_build_object(
      'id', caption_id_value, 'imageId', generation.image_id, 'text', caption_text));
  end loop;
  update public.punnett_generations set status = 'completed', completed_at = now() where id = generation.id;
  return jsonb_build_object('id', generation.id, 'image_id', generation.image_id, 'captions', caption_results);
end;
$$;

create function public.punnett_fail_generation(generation_id_input uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required.' using errcode = '42501'; end if;
  update public.punnett_generations set status = 'failed'
    where id = generation_id_input and owner_id = auth.uid() and status = 'pending';
end;
$$;

create function public.punnett_caption_page(offset_input integer default 0)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare results jsonb; more boolean;
begin
  if offset_input is null or offset_input < 0 or offset_input > 1000000 then
    raise exception 'Invalid page offset.' using errcode = '22023';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('id', page.id, 'imageId', page.image_id, 'text', page.content)
    order by page.created_at, page.id), '[]'::jsonb) into results
  from (select c.id, c.image_id, c.content, c.created_at from public.punnett_captions c
    join public.punnett_generations g on g.id = c.generation_id and g.status = 'completed'
    order by c.created_at, c.id limit 500 offset offset_input) page;
  select exists(select 1 from public.punnett_captions c
    join public.punnett_generations g on g.id = c.generation_id and g.status = 'completed'
    order by c.created_at, c.id limit 1 offset (offset_input + 500)) into more;
  return jsonb_build_object('captions', results, 'hasMore', more);
end;
$$;

create function public.punnett_read_image(image_id_input uuid)
returns text language sql stable security definer set search_path = '' as $$
  select i.data_url from public.punnett_images i
  join public.punnett_generations g on g.image_id = i.id and g.status = 'completed'
  where i.id = image_id_input;
$$;

create function public.punnett_voted_ids(offset_input integer default 0)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare caller uuid := auth.uid(); results jsonb; more boolean;
begin
  if caller is null then raise exception 'Authentication required.' using errcode = '42501'; end if;
  if offset_input is null or offset_input < 0 or offset_input > 1000000 then
    raise exception 'Invalid page offset.' using errcode = '22023';
  end if;
  select coalesce(jsonb_agg(page.caption_id order by page.created_at, page.id), '[]'::jsonb) into results
  from (select id, caption_id, created_at from public.punnett_caption_votes where owner_id = caller
    order by created_at, id limit 500 offset offset_input) page;
  select exists(select 1 from public.punnett_caption_votes where owner_id = caller
    order by created_at, id limit 1 offset (offset_input + 500)) into more;
  return jsonb_build_object('ids', results, 'hasMore', more);
end;
$$;

create function public.punnett_vote_history(offset_input integer default 0)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare caller uuid := auth.uid(); results jsonb; more boolean;
begin
  if caller is null then raise exception 'Authentication required.' using errcode = '42501'; end if;
  if offset_input is null or offset_input < 0 or offset_input > 1000000 then
    raise exception 'Invalid page offset.' using errcode = '22023';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('id', page.id, 'captionId', page.caption_id,
    'imageId', page.image_id, 'text', page.content, 'vote', page.vote, 'createdAt', page.created_at)
    order by page.created_at desc, page.id desc), '[]'::jsonb) into results
  from (select v.id, v.caption_id, c.image_id, c.content, v.vote, v.created_at
    from public.punnett_caption_votes v join public.punnett_captions c on c.id = v.caption_id
    where v.owner_id = caller order by v.created_at desc, v.id desc limit 500 offset offset_input) page;
  select exists(select 1 from public.punnett_caption_votes where owner_id = caller
    order by created_at desc, id desc limit 1 offset (offset_input + 500)) into more;
  return jsonb_build_object('votes', results, 'hasMore', more);
end;
$$;

create function public.punnett_select_vote(winner_id_input uuid, loser_id_input uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare caller uuid := auth.uid(); winner_image uuid; loser_image uuid;
begin
  if caller is null then raise exception 'Authentication required.' using errcode = '42501'; end if;
  if winner_id_input is null or loser_id_input is null or winner_id_input = loser_id_input then
    raise exception 'Select two distinct captions.' using errcode = '22023';
  end if;
  select c.image_id into winner_image from public.punnett_captions c
    join public.punnett_generations g on g.id = c.generation_id and g.status = 'completed'
    where c.id = winner_id_input;
  select c.image_id into loser_image from public.punnett_captions c
    join public.punnett_generations g on g.id = c.generation_id and g.status = 'completed'
    where c.id = loser_id_input;
  if winner_image is null or loser_image is null or winner_image <> loser_image then
    raise exception 'Captions must be published and from one image.' using errcode = '22023';
  end if;
  -- One statement provides all-or-nothing insertion. The unique constraint also
  -- rejects concurrent repeats with 23505; there can be no one-sided vote.
  insert into public.punnett_caption_votes(owner_id, caption_id, vote)
    values (caller, winner_id_input, 1), (caller, loser_id_input, -1);
  return jsonb_build_object('winner_id', winner_id_input, 'loser_id', loser_id_input);
end;
$$;

revoke all on function public.punnett_create_generation(text, text, text) from public, anon, authenticated;
revoke all on function public.punnett_complete_generation(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.punnett_fail_generation(uuid) from public, anon, authenticated;
revoke all on function public.punnett_caption_page(integer) from public, anon, authenticated;
revoke all on function public.punnett_read_image(uuid) from public, anon, authenticated;
revoke all on function public.punnett_voted_ids(integer) from public, anon, authenticated;
revoke all on function public.punnett_vote_history(integer) from public, anon, authenticated;
revoke all on function public.punnett_select_vote(uuid, uuid) from public, anon, authenticated;

grant execute on function public.punnett_caption_page(integer), public.punnett_read_image(uuid) to anon, authenticated;
grant execute on function public.punnett_create_generation(text, text, text),
  public.punnett_complete_generation(uuid, jsonb), public.punnett_fail_generation(uuid),
  public.punnett_voted_ids(integer), public.punnett_vote_history(integer),
  public.punnett_select_vote(uuid, uuid) to authenticated;

notify pgrst, 'reload schema';
commit;

-- Owner diagnostic: all four new tables must report rls_enabled = true.
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in
  ('punnett_images', 'punnett_generations', 'punnett_captions', 'punnett_caption_votes')
order by c.relname;
