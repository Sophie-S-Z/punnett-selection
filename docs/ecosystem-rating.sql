-- Owner-applied survival rating extension. No policies or direct table grants.
begin;

create or replace function public.punnett_rate_specimen(caption_id_input uuid, vote_input smallint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare caller uuid := auth.uid();
begin
  if caller is null then raise exception 'Authentication required.' using errcode = '42501'; end if;
  if caption_id_input is null or vote_input is null or vote_input not in (-1, 1) then
    raise exception 'Select a specimen and a survival rating.' using errcode = '22023';
  end if;
  -- Lock the publication record so an owner archive cannot race the vote.
  perform g.id from public.punnett_captions c
    join public.punnett_generations g on g.id = c.generation_id
    where c.id = caption_id_input and g.status = 'completed' for share of g;
  if not found then raise exception 'Specimen is not published.' using errcode = '22023'; end if;
  insert into public.punnett_caption_votes(owner_id, caption_id, vote)
    values (caller, caption_id_input, vote_input);
  return jsonb_build_object('captionId', caption_id_input, 'vote', vote_input);
end;
$$;

create or replace function public.punnett_ecosystem_page(offset_input integer default 0)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare results jsonb; more boolean;
begin
  if offset_input is null or offset_input < 0 or offset_input > 1000000 then
    raise exception 'Invalid page offset.' using errcode = '22023';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('id', page.id, 'imageId', page.image_id,
    'text', page.content, 'up', counts.up, 'down', counts.down)
    order by page.created_at, page.id), '[]'::jsonb) into results
  from (select c.id, c.image_id, c.content, c.created_at from public.punnett_captions c
    join public.punnett_generations g on g.id = c.generation_id and g.status = 'completed'
    order by c.created_at, c.id limit 500 offset offset_input) page
  cross join lateral (select count(*) filter (where v.vote = 1) as up,
    count(*) filter (where v.vote = -1) as down
    from public.punnett_caption_votes v where v.caption_id = page.id) counts;
  select exists(select 1 from public.punnett_captions c
    join public.punnett_generations g on g.id = c.generation_id and g.status = 'completed'
    order by c.created_at, c.id limit 1 offset (offset_input + 500)) into more;
  return jsonb_build_object('specimens', results, 'hasMore', more);
end;
$$;

revoke all on function public.punnett_rate_specimen(uuid, smallint) from public, anon, authenticated;
revoke all on function public.punnett_ecosystem_page(integer) from public, anon, authenticated;
grant execute on function public.punnett_rate_specimen(uuid, smallint) to authenticated;
grant execute on function public.punnett_ecosystem_page(integer) to anon, authenticated;
notify pgrst, 'reload schema';
commit;
