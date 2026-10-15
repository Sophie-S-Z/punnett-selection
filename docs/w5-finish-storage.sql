-- Run after the app has transferred recent general-humor images to Storage.
-- Aborts rather than discard any image bytes that still need migration.
begin;
do $$
begin
 if exists(select 1 from information_schema.columns where table_schema='public' and table_name='punnett_images' and column_name='data_url') then
  if exists(select 1 from public.punnett_images where data_url is not null) then
   raise exception 'Image migration is incomplete. Open the new app as the image owner before continuing.';
  end if;
  alter table public.punnett_images drop column data_url;
 end if;
end;
$$;
revoke execute on function public.punnett_migrate_image(uuid,text) from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
select column_name,data_type from information_schema.columns
where table_schema='public' and table_name='punnett_images' order by ordinal_position;
