-- Read-only W3 preflight. Run in the existing project's Supabase SQL editor.
-- This does not read profile records, secrets, or image contents.
select table_schema, table_name, column_name, data_type, is_nullable,
       column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in ('profiles', 'captions', 'images')
order by table_name, ordinal_position;

select t.tgname as trigger_name,
       pg_get_triggerdef(t.oid) as trigger_definition,
       n.nspname as function_schema, p.proname as function_name
from pg_trigger t
join pg_proc p on p.oid = t.tgfoid
join pg_namespace n on n.oid = p.pronamespace
where t.tgrelid = 'auth.users'::regclass
  and not t.tgisinternal;

select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets;
