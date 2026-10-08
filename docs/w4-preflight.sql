-- Read-only diagnostics. Run in the intended course project.
-- Share the output, not credentials. This does not change RLS or any table.

select table_name, ordinal_position, column_name, data_type,
       is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in ('captions', 'caption_votes', 'images', 'caption_requests', 'llm_responses')
order by table_name, ordinal_position;

select c.relname as table_name, con.conname as constraint_name,
       con.contype as constraint_type, pg_get_constraintdef(con.oid) as definition
from pg_constraint con
join pg_class c on c.oid = con.conrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('captions', 'caption_votes', 'images', 'caption_requests', 'llm_responses')
order by c.relname, con.conname;

select c.relname as table_name, c.relrowsecurity as rls_enabled,
       c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by c.relname;
