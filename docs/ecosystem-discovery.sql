-- Owner-run discovery extension. No policy statements. Run after w4-rating.sql.
begin;
create table if not exists public.punnett_discoveries (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 prompt text not null check(char_length(prompt) between 1 and 12000),
 model text not null check(char_length(model) between 1 and 100),
 status text not null default 'pending' check(status in ('pending','ready','failed','published')),
 label text, notes text, gbif_key bigint, kingdom text, wikipedia_url text, wikipedia_revision text,
 specimen_id bigint references public.lab_specimens(id), image_id uuid references public.punnett_images(id),
 created_at timestamptz not null default now(),
 publication_attempts integer not null default 0, publication_started_at timestamptz
);
alter table public.punnett_discoveries add column if not exists publication_attempts integer not null default 0;
alter table public.punnett_discoveries add column if not exists publication_started_at timestamptz;
create index if not exists punnett_discoveries_owner_time on public.punnett_discoveries(owner_id,created_at);
alter table public.punnett_discoveries enable row level security;
revoke all on table public.punnett_discoveries from public, anon, authenticated;

create or replace function public.punnett_claim_discovery(discovery_id_input uuid)
returns void language plpgsql security definer set search_path='' as $$
declare d public.punnett_discoveries;
begin
 if auth.uid() is null then raise exception 'Authentication required.' using errcode='42501'; end if;
 select * into d from public.punnett_discoveries where id=discovery_id_input and owner_id=auth.uid() and status='ready' for update;
 if not found then raise exception 'Proposal unavailable.' using errcode='42501'; end if;
 if d.publication_attempts>=3 then raise exception 'publication_attempt_limit'; end if;
 if d.publication_started_at>now()-interval '60 seconds' then raise exception 'publication_cooldown'; end if;
 update public.punnett_discoveries set publication_attempts=publication_attempts+1,publication_started_at=now() where id=d.id;
end $$;

create or replace function public.punnett_begin_discovery(prompt_input text, model_input text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare caller uuid:=auth.uid(); discovery_id uuid;
begin
 if caller is null then raise exception 'Authentication required.' using errcode='42501'; end if;
 if prompt_input is null or char_length(btrim(prompt_input)) not between 1 and 12000 or model_input is null or char_length(btrim(model_input)) not between 1 and 100 then raise exception 'Invalid discovery prompt.' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended(caller::text || ':discovery',0));
 if (select count(*) from public.punnett_discoveries where owner_id=caller and created_at>now()-interval '24 hours')>=3 then raise exception 'discovery_daily_limit'; end if;
 insert into public.punnett_discoveries(owner_id,prompt,model) values(caller,prompt_input,model_input) returning id into discovery_id;
 return jsonb_build_object('id',discovery_id);
end $$;

create or replace function public.punnett_discovery_proposal(discovery_id_input uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare caller uuid:=auth.uid(); d public.punnett_discoveries;
begin
 if caller is null then raise exception 'Authentication required.' using errcode='42501'; end if;
 select * into d from public.punnett_discoveries where id=discovery_id_input and owner_id=caller and status in ('ready','published');
 if not found then raise exception 'Proposal unavailable.' using errcode='42501'; end if;
 return jsonb_build_object('id',d.id,'status',d.status,'label',d.label,'notes',d.notes,'gbifKey',d.gbif_key,'kingdom',d.kingdom,'wikipediaUrl',d.wikipedia_url,'revision',d.wikipedia_revision,'imageId',d.image_id);
end $$;

create or replace function public.punnett_prepare_discovery(discovery_id_input uuid,label_input text,notes_input text,gbif_key_input bigint,kingdom_input text,wikipedia_url_input text,revision_input text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare caller uuid:=auth.uid(); taxon text;
begin
 if caller is null then raise exception 'Authentication required.' using errcode='42501'; end if;
 if label_input is null or char_length(label_input)>180 or label_input !~ '^[^()]{2,90} \([A-Z][a-z]+ [a-z][a-z-]+\)$' or notes_input is null or char_length(notes_input) not between 60 and 450 or gbif_key_input is null or gbif_key_input<=0 or kingdom_input is null or kingdom_input not in ('Animalia','Plantae','Fungi') or wikipedia_url_input is null or wikipedia_url_input !~ '^https://en\.wikipedia\.org/wiki/[A-Za-z0-9_%().-]+$' or revision_input is null or revision_input !~ '^[0-9]+$' then raise exception 'Invalid species provenance.' using errcode='22023'; end if;
 taxon:=substring(label_input from '\(([A-Z][a-z]+ [a-z][a-z-]+)\)$');
 if strpos(lower(notes_input),lower(taxon))=0 then raise exception 'Facts must identify the source taxon.' using errcode='22023'; end if;
 update public.punnett_discoveries set label=label_input,notes=notes_input,gbif_key=gbif_key_input,kingdom=kingdom_input,wikipedia_url=wikipedia_url_input,wikipedia_revision=revision_input,status='ready' where id=discovery_id_input and owner_id=caller and status='pending';
 if not found then raise exception 'Proposal unavailable.' using errcode='42501'; end if;
 return public.punnett_discovery_proposal(discovery_id_input);
end $$;

create or replace function public.punnett_fail_discovery(discovery_id_input uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required.' using errcode='42501'; end if;
 update public.punnett_discoveries set status='failed' where id=discovery_id_input and owner_id=auth.uid() and status='pending';
 if not found then raise exception 'Proposal unavailable.' using errcode='42501'; end if;
end $$;

create or replace function public.punnett_publish_discovery(discovery_id_input uuid,image_data_url text,prompt_input text,model_input text,captions_input jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare caller uuid:=auth.uid(); d public.punnett_discoveries; specimen_id_value bigint; generation jsonb; completed jsonb; previous_image uuid;
begin
 if caller is null then raise exception 'Authentication required.' using errcode='42501'; end if;
 select * into d from public.punnett_discoveries where id=discovery_id_input and owner_id=caller for update;
 if not found or d.status not in ('ready','published') then raise exception 'Proposal unavailable.' using errcode='42501'; end if;
 if d.status='published' then
  return jsonb_build_object('image_id',d.image_id,'specimen_id',d.specimen_id,'captions',(select jsonb_agg(jsonb_build_object('id',c.id,'imageId',c.image_id,'text',c.content) order by c.created_at,c.id) from public.punnett_captions c where c.image_id=d.image_id));
 end if;
 if captions_input is null or jsonb_typeof(captions_input)<>'array' then raise exception 'Invalid field notes.' using errcode='22023'; end if;
 if jsonb_array_length(captions_input) not between 2 and 6 or exists(select 1 from jsonb_array_elements(captions_input) caption where jsonb_typeof(caption)<>'string' or char_length(caption#>>'{}') not between 1 and 500 or left(caption#>>'{}',char_length(d.label)+3)<>d.label || ' — ' or char_length(btrim(substring(caption#>>'{}' from char_length(d.label)+4)))=0 or (caption#>>'{}') ~* '\m(website|webpage|dashboard|login|supabase|vercel|screenshot)\M') then raise exception 'Invalid field notes.' using errcode='22023'; end if;
 -- Serialize catalog allocation and duplicate discovery checks, including concurrent publishers.
 lock table public.lab_specimens in share row exclusive mode;
 select image_id,specimen_id into previous_image,specimen_id_value from public.punnett_discoveries where status='published' and gbif_key=d.gbif_key order by created_at limit 1;
 if previous_image is not null then
  update public.punnett_discoveries set status='published',image_id=previous_image,specimen_id=specimen_id_value where id=d.id;
  return jsonb_build_object('image_id',previous_image,'specimen_id',specimen_id_value,'captions',(select jsonb_agg(jsonb_build_object('id',c.id,'imageId',c.image_id,'text',c.content) order by c.created_at,c.id) from public.punnett_captions c where c.image_id=previous_image));
 end if;
 select id into specimen_id_value from public.lab_specimens where lower(label)=lower(d.label) limit 1;
 if specimen_id_value is null then
  select coalesce(max(id),0)+1 into specimen_id_value from public.lab_specimens;
  insert into public.lab_specimens(id,code,label,notes) overriding system value values(specimen_id_value,'DISC-' || d.gbif_key::text,d.label,d.notes);
  -- Keep any existing identity sequence in sync with owner/manual insertions.
  if pg_get_serial_sequence('public.lab_specimens','id') is not null then perform setval(pg_get_serial_sequence('public.lab_specimens','id'),specimen_id_value,true); end if;
 end if;
 generation:=public.punnett_create_generation(image_data_url,prompt_input,model_input);
 completed:=public.punnett_complete_generation((generation->>'id')::uuid,captions_input);
 update public.punnett_discoveries set status='published',image_id=(completed->>'image_id')::uuid,specimen_id=specimen_id_value where id=d.id;
 return completed || jsonb_build_object('specimen_id',specimen_id_value);
end $$;

create or replace function public.punnett_species_sources()
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(row_data order by specimen_id),'[]'::jsonb) from (
  select distinct on(d.specimen_id) d.specimen_id,jsonb_build_object('specimenId',d.specimen_id,'label',d.label,'gbifKey',d.gbif_key,'wikipediaUrl',d.wikipedia_url,'revision',d.wikipedia_revision,'kingdom',d.kingdom) row_data from public.punnett_discoveries d join public.punnett_generations g on g.image_id=d.image_id and g.status='completed' where d.status='published' order by d.specimen_id,d.created_at
 ) sources;
$$;

revoke all on function public.punnett_begin_discovery(text,text), public.punnett_discovery_proposal(uuid), public.punnett_prepare_discovery(uuid,text,text,bigint,text,text,text), public.punnett_fail_discovery(uuid), public.punnett_claim_discovery(uuid), public.punnett_publish_discovery(uuid,text,text,text,jsonb), public.punnett_species_sources() from public,anon,authenticated;
grant execute on function public.punnett_begin_discovery(text,text), public.punnett_discovery_proposal(uuid), public.punnett_prepare_discovery(uuid,text,text,bigint,text,text,text), public.punnett_fail_discovery(uuid), public.punnett_claim_discovery(uuid), public.punnett_publish_discovery(uuid,text,text,text,jsonb) to authenticated;
grant execute on function public.punnett_species_sources() to anon,authenticated;
notify pgrst,'reload schema';
commit;
select c.relname as table_name,c.relrowsecurity as rls_enabled from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='punnett_discoveries';
