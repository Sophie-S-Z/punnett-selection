-- Run once in the SQL Editor of punnett-staging.
-- Creates the assignment's table, trigger, and private photo bucket.
-- Does not create or change any RLS policy.
-- If profiles already exists, the transaction fails without replacing it.
begin;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text check (char_length(first_name) <= 100),
  last_name text check (char_length(last_name) <= 100),
  avatar_path text,
  is_superadmin boolean not null default false,
  is_matrix_admin boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint own_avatar_path check (
    avatar_path is null or avatar_path like id::text || '/%'
  )
);

-- Access goes through the current-user functions below.
-- No browser can directly read or update someone else's profile.
revoke all on public.profiles from public, anon, authenticated;

create function public.punnett_handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;
revoke all on function public.punnett_handle_new_user() from public, anon, authenticated;

create trigger punnett_auth_user_created
after insert on auth.users
for each row execute function public.punnett_handle_new_user();

-- Accounts created before this migration also need a profile.
insert into public.profiles (id) select id from auth.users;

create function public.punnett_get_profile()
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare result jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select jsonb_build_object(
    'id', id, 'first_name', first_name, 'last_name', last_name,
    'avatar_path', avatar_path, 'updated_at', updated_at
  ) into result from public.profiles where id = auth.uid();
  if result is null then raise exception 'Profile row is missing'; end if;
  return result;
end;
$$;
revoke all on function public.punnett_get_profile() from public, anon;
grant execute on function public.punnett_get_profile() to authenticated;

create function public.punnett_save_profile(
  first_name_input text, last_name_input text, avatar_path_input text default null
)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if first_name_input is null or last_name_input is null
    or char_length(btrim(first_name_input)) not between 1 and 100
    or char_length(btrim(last_name_input)) not between 1 and 100 then
    raise exception 'Enter a first name and last name of 1 to 100 characters each';
  end if;
  if avatar_path_input is not null
    and (avatar_path_input not like auth.uid()::text || '/%'
      or avatar_path_input like '%..%') then
    raise exception 'Invalid photo path';
  end if;
  update public.profiles
  set first_name = btrim(first_name_input), last_name = btrim(last_name_input),
      avatar_path = coalesce(avatar_path_input, avatar_path), updated_at = now()
  where id = auth.uid();
  if not found then raise exception 'Profile row is missing'; end if;
  return public.punnett_get_profile();
end;
$$;
revoke all on function public.punnett_save_profile(text,text,text) from public, anon;
grant execute on function public.punnett_save_profile(text,text,text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-photos', 'profile-photos', false, 2097152,
  array['image/jpeg', 'image/png', 'image/webp']);

notify pgrst, 'reload schema';
commit;

-- This final SELECT returns one diagnostic row, even when no users exist.
select jsonb_build_object(
  'profiles_table', to_regclass('public.profiles')::text,
  'first_name_nullable', (select is_nullable from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'first_name'),
  'last_name_nullable', (select is_nullable from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'last_name'),
  'signup_trigger', exists (select 1 from pg_trigger
    where tgrelid = 'auth.users'::regclass and tgname = 'punnett_auth_user_created'),
  'photo_bucket', exists (select 1 from storage.buckets where id = 'profile-photos')
) as w3_setup;
