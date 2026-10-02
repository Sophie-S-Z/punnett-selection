-- Run once in the existing Supabase SQL editor. No policies are changed.
begin;
create table public.punnett_bench_specimens (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  label text not null check (char_length(btrim(label)) between 1 and 200),
  notes text not null default '' check (char_length(notes) <= 4000),
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index punnett_bench_owner_idx on public.punnett_bench_specimens(owner_id, created_at desc, id);
revoke all on public.punnett_bench_specimens from public, anon, authenticated;

create function public.punnett_list_bench() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  return jsonb_build_object('specimens', coalesce((
    select jsonb_agg(to_jsonb(s) - 'owner_id' order by s.created_at desc, s.id)
    from public.punnett_bench_specimens s where s.owner_id = auth.uid()
  ), '[]'::jsonb));
end;
$$;

-- Stable client-generated ids make a retried add safe after a lost response.
create function public.punnett_save_bench(id_input uuid, label_input text, notes_input text, revision_input integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare saved public.punnett_bench_specimens;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if id_input is null or label_input is null or notes_input is null or revision_input is null
     or char_length(btrim(label_input)) not between 1 and 200 or char_length(notes_input) > 4000
     or label_input ~ '[[:cntrl:]]' then
    raise exception 'Invalid specimen' using errcode = '22023';
  end if;
  if revision_input = 0 then
    insert into public.punnett_bench_specimens(id, owner_id, label, notes)
    values (id_input, auth.uid(), btrim(label_input), notes_input)
    on conflict (id) do nothing returning * into saved;
    if saved.id is null then
      select * into saved from public.punnett_bench_specimens
      where id = id_input and owner_id = auth.uid() and label = btrim(label_input) and notes = notes_input;
    end if;
  else
    update public.punnett_bench_specimens set label = btrim(label_input), notes = notes_input,
      revision = revision + 1, updated_at = now()
    where id = id_input and owner_id = auth.uid() and revision = revision_input returning * into saved;
  end if;
  if saved.id is null then raise exception 'Specimen changed or unavailable' using errcode = '40001'; end if;
  return to_jsonb(saved) - 'owner_id';
end;
$$;

create function public.punnett_delete_bench(id_input uuid, revision_input integer) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  delete from public.punnett_bench_specimens
  where id = id_input and owner_id = auth.uid() and revision = revision_input;
  if not found then raise exception 'Specimen changed or unavailable' using errcode = '40001'; end if;
end;
$$;

revoke all on function public.punnett_list_bench() from public, anon;
revoke all on function public.punnett_save_bench(uuid, text, text, integer) from public, anon;
revoke all on function public.punnett_delete_bench(uuid, integer) from public, anon;
grant execute on function public.punnett_list_bench() to authenticated;
grant execute on function public.punnett_save_bench(uuid, text, text, integer) to authenticated;
grant execute on function public.punnett_delete_bench(uuid, integer) to authenticated;
commit;

select jsonb_build_object('bench_table', to_regclass('public.punnett_bench_specimens') is not null,
  'bench_list', to_regprocedure('public.punnett_list_bench()') is not null,
  'bench_save', to_regprocedure('public.punnett_save_bench(uuid,text,text,integer)') is not null,
  'bench_delete', to_regprocedure('public.punnett_delete_bench(uuid,integer)') is not null);
