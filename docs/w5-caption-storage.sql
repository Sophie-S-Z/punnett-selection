-- W5 caption-only cutover. Run once as the database owner, after backup.
-- Archives pre-cutover biology content. Recent meme images migrate through owner RPCs.
-- Retains caption texts, prompts and vote records for audit. No RLS policy changes.
begin;
alter table public.punnett_generations add column if not exists archived boolean not null default true;
alter table public.punnett_generations alter column archived set default false;
alter table public.punnett_images add column if not exists storage_path text unique;
-- Revoke the obsolete creation/discovery APIs so old clients cannot republish species data.
revoke execute on function public.punnett_create_generation(text,text,text) from public,anon,authenticated;
create or replace function public.punnett_caption_page(offset_input integer default 0)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare results jsonb; more boolean;
begin
  if offset_input is null or offset_input < 0 or offset_input > 1000000 then
    raise exception 'Invalid page offset.' using errcode = '22023';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('id', page.id, 'imageId', page.image_id, 'text', page.content)
    order by page.created_at, page.id), '[]'::jsonb) into results
  from (select c.id, c.image_id, c.content, c.created_at from public.punnett_captions c
    join public.punnett_generations g on g.id = c.generation_id and g.status = 'completed' and not g.archived
    order by c.created_at, c.id limit 500 offset offset_input) page;
  select exists(select 1 from public.punnett_captions c
    join public.punnett_generations g on g.id = c.generation_id and g.status = 'completed' and not g.archived
    order by c.created_at, c.id limit 1 offset (offset_input + 500)) into more;
  return jsonb_build_object('captions', results, 'hasMore', more);
end;
$$;
create or replace function public.punnett_vote_history(offset_input integer default 0)
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
    join public.punnett_generations g on g.id=c.generation_id and not g.archived and g.status='completed'
    where v.owner_id = caller order by v.created_at desc, v.id desc limit 500 offset offset_input) page;
  select exists(select 1 from public.punnett_caption_votes v
    join public.punnett_captions c on c.id=v.caption_id
    join public.punnett_generations g on g.id=c.generation_id and not g.archived and g.status='completed'
    where v.owner_id = caller order by v.created_at desc, v.id desc limit 1 offset (offset_input + 500)) into more;
  return jsonb_build_object('votes', results, 'hasMore', more);
end;
$$;
create or replace function public.punnett_select_vote(winner_id_input uuid, loser_id_input uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare caller uuid := auth.uid(); winner_image uuid; loser_image uuid;
begin
  if caller is null then raise exception 'Authentication required.' using errcode = '42501'; end if;
  if winner_id_input is null or loser_id_input is null or winner_id_input = loser_id_input then
    raise exception 'Select two distinct captions.' using errcode = '22023';
  end if;
  select c.image_id into winner_image from public.punnett_captions c
    join public.punnett_generations g on g.id = c.generation_id and g.status = 'completed' and not g.archived
    where c.id = winner_id_input;
  select c.image_id into loser_image from public.punnett_captions c
    join public.punnett_generations g on g.id = c.generation_id and g.status = 'completed' and not g.archived
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
create or replace function public.punnett_complete_generation(generation_id_input uuid, captions_input jsonb)
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
  if not found or generation.status <> 'pending' or generation.archived then
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
create or replace function public.punnett_read_image(image_id_input uuid)
returns text language sql stable security definer set search_path = '' as $$
 select i.storage_path from public.punnett_images i
 join public.punnett_generations g on g.image_id=i.id and g.status='completed' and not g.archived
 where i.id=image_id_input;
$$;

create or replace function public.punnett_create_generation_v2(image_path_input text,prompt_input text,model_input text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare caller uuid:=auth.uid(); image_value uuid; generation_value uuid;
begin
 if caller is null then raise exception 'Authentication required.' using errcode='42501'; end if;
 if image_path_input is null or image_path_input !~ ('^'||caller::text||'/[0-9a-f-]{36}[.]jpg$')
  or prompt_input is null or char_length(btrim(prompt_input)) not between 1 and 2000
  or model_input is null or char_length(btrim(model_input)) not between 1 and 100 then
  raise exception 'Invalid storage path, prompt or model.' using errcode='22023';
 end if;
 if not exists(select 1 from storage.objects where bucket_id='caption-images' and name=image_path_input) then
  raise exception 'Upload the image before saving a generation.' using errcode='22023';
 end if;
 perform pg_advisory_xact_lock(hashtextextended(caller::text,0));
 if (select count(*) from public.punnett_generations where owner_id=caller and not archived
     and created_at>=now()-interval '24 hours')>=10 then
  raise exception 'daily_limit: Ten generation attempts per 24 hours.' using errcode='22023';
 end if;
 insert into public.punnett_images(owner_id,storage_path,mime_type)
  values(caller,image_path_input,'image/jpeg') returning id into image_value;
 insert into public.punnett_generations(image_id,owner_id,prompt,model)
  values(image_value,caller,btrim(prompt_input),btrim(model_input)) returning id into generation_value;
 return jsonb_build_object('id',generation_value,'image_id',image_value);
end;
$$;
revoke all on function public.punnett_create_generation_v2(text,text,text) from public,anon,authenticated;
grant execute on function public.punnett_create_generation_v2(text,text,text) to authenticated;

-- Storage SELECT policies can call this narrow predicate without granting table access.
create or replace function public.punnett_image_is_public(path_input text)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.punnett_images i join public.punnett_generations g on g.image_id=i.id
 where i.storage_path=path_input and g.status='completed' and not g.archived);
$$;
revoke all on function public.punnett_image_is_public(text) from public,anon,authenticated;
grant execute on function public.punnett_image_is_public(text) to anon,authenticated;

-- Disable obsolete ecosystem/bench RPCs without dropping historical audit records.
do $$
declare f record;
begin
 for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname in ('punnett_rate_specimen','punnett_ecosystem_page',
 'punnett_begin_discovery','punnett_discovery_proposal','punnett_prepare_discovery','punnett_fail_discovery',
 'punnett_claim_discovery','punnett_publish_discovery','punnett_list_bench','punnett_save_bench','punnett_delete_bench')
 loop execute format('revoke execute on function %s from public,anon,authenticated',f.signature); end loop;
end;
$$;
-- Remove irrelevant embedded images now. Preserve recent meme bytes until Storage transfer succeeds.
do $$
begin
 if exists(select 1 from information_schema.columns where table_schema='public' and table_name='punnett_images' and column_name='data_url') then
  alter table public.punnett_images alter column data_url drop not null;
  update public.punnett_images i set data_url=null from public.punnett_generations g
  where g.image_id=i.id and g.archived and g.prompt not like 'Write four funny, original meme captions for the uploaded image.%';
 end if;
end;
$$;

create or replace function public.punnett_creation_history(offset_input integer default 0)
returns jsonb language plpgsql security definer set search_path='' as $$
declare caller uuid:=auth.uid(); results jsonb; more boolean;
begin
 if caller is null then raise exception 'Authentication required.' using errcode='42501'; end if;
 if offset_input is null or offset_input<0 or offset_input>1000000 then raise exception 'Invalid offset.' using errcode='22023'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'imageId',p.image_id,'text',p.content,'createdAt',p.created_at) order by p.created_at desc,p.id desc),'[]'::jsonb) into results
 from (select c.* from public.punnett_captions c join public.punnett_generations g on g.id=c.generation_id
 where g.owner_id=caller and not g.archived and g.status='completed' order by c.created_at desc,c.id desc limit 500 offset offset_input) p;
 select exists(select 1 from public.punnett_captions c join public.punnett_generations g on g.id=c.generation_id
 where g.owner_id=caller and not g.archived and g.status='completed' order by c.created_at desc,c.id desc limit 1 offset offset_input+500) into more;
 return jsonb_build_object('captions',results,'hasMore',more);
end;
$$;
revoke all on function public.punnett_creation_history(integer) from public,anon,authenticated;
grant execute on function public.punnett_creation_history(integer) to authenticated;

-- Temporary, authenticated bridge for existing general-humor images. No client receives these bytes.
create or replace function public.punnett_legacy_image_page()
returns jsonb language plpgsql security definer set search_path='' as $$
declare caller uuid:=auth.uid(); results jsonb;
begin
 if caller is null then raise exception 'Authentication required.' using errcode='42501'; end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='punnett_images' and column_name='data_url') then return '[]'::jsonb; end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'dataUrl',p.data_url)),'[]'::jsonb) into results
 from(select i.id,i.data_url from public.punnett_images i join public.punnett_generations g on g.image_id=i.id
 where i.owner_id=caller and g.owner_id=caller and g.status='completed' and i.storage_path is null and i.data_url is not null
 and g.prompt like 'Write four funny, original meme captions for the uploaded image.%' order by i.created_at,i.id limit 5) p;
 return results;
end;
$$;
create or replace function public.punnett_migrate_image(image_id_input uuid,image_path_input text)
returns text language plpgsql security definer set search_path='' as $$
declare caller uuid:=auth.uid(); old_image public.punnett_images%rowtype;
begin
 if caller is null then raise exception 'Authentication required.' using errcode='42501'; end if;
 if image_path_input is null or image_path_input !~ ('^'||caller::text||'/[0-9a-f-]{36}[.]jpg$')
 or not exists(select 1 from storage.objects where bucket_id='caption-images' and name=image_path_input) then
 raise exception 'Invalid uploaded object.' using errcode='22023'; end if;
 select i.* into old_image from public.punnett_images i join public.punnett_generations g on g.image_id=i.id
 where i.id=image_id_input and i.owner_id=caller and g.owner_id=caller and g.status='completed'
 and g.prompt like 'Write four funny, original meme captions for the uploaded image.%' for update of i;
 if not found then raise exception 'Image is unavailable.' using errcode='22023'; end if;
 if old_image.storage_path is not null then return old_image.storage_path; end if;
 update public.punnett_images set storage_path=image_path_input,data_url=null where id=old_image.id;
 update public.punnett_generations set archived=false where image_id=old_image.id;
 return image_path_input;
end;
$$;
revoke all on function public.punnett_legacy_image_page(),public.punnett_migrate_image(uuid,text) from public,anon,authenticated;
grant execute on function public.punnett_legacy_image_page(),public.punnett_migrate_image(uuid,text) to authenticated;
notify pgrst,'reload schema';
commit;

-- Read-only acceptance diagnostics. All rows below must report the expected flags.
select count(*) filter(where archived) as archived_generations,count(*) filter(where not archived) as active_generations
from public.punnett_generations;
select table_name,column_name,data_type from information_schema.columns
where table_schema='public' and table_name='punnett_images' order by ordinal_position;
select c.relname,c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r' order by c.relname;
