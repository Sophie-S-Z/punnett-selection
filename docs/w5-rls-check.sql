-- Read-only: run this query by itself in the Supabase SQL editor.
-- true = RLS is enabled; false = it is disabled.
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r'
order by c.relname;
