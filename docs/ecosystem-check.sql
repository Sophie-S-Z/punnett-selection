-- Small saved-query check. The large seed query has already executed.
-- Replacing editor text does not undo previously committed database changes.
select count(*) as field_notes,
       count(distinct split_part(c.content, ' — ', 1)) as organisms
from public.punnett_captions c
join public.punnett_generations g on g.id = c.generation_id
where g.status = 'completed';

select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname = 'punnett_discoveries';
