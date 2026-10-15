# Storage policy conditions for the owner to apply

The owner explicitly authorized providing these conditions on 2026-10-10 as a narrow exception to AGENTS.md R1. The agent does not create or apply policies.

First run `w5-caption-storage.sql` so `punnett_image_is_public` exists. Create the **private** `caption-images` bucket with 2 MiB and `image/jpeg` limits.
Go to Storage → Policies → New policy → For full customization. Each policy applies to `storage.objects`. Create four separate policies below. Keep UPDATE unchecked for all four.

## 1. `caption_images_insert_own`

Operation: INSERT. Target role: authenticated. WITH CHECK condition:

```sql
bucket_id = 'caption-images'
and name ~ ('^' || (select auth.uid())::text || '/[0-9a-f-]{36}[.]jpg$')
```

## 2. `caption_images_read_own`

Operation: SELECT. Target role: authenticated. USING condition:

```sql
bucket_id = 'caption-images'
and (storage.foldername(name))[1] = (select auth.uid())::text
```

## 3. `caption_images_read_completed`

Operation: SELECT. Target roles: anon and authenticated. USING condition:

```sql
bucket_id = 'caption-images'
and public.punnett_image_is_public(name)
```

## 4. `caption_images_delete_unpublished_own`

Operation: DELETE. Target role: authenticated. USING condition:

```sql
bucket_id = 'caption-images'
and (storage.foldername(name))[1] = (select auth.uid())::text
and not public.punnett_image_is_public(name)
```

Click Review, verify the chosen operation and roles, and Save for each policy. Do not select UPDATE or grant broad bucket-wide uploads/deletes.

Review all existing policies on `storage.objects`. Permissive policies combine with OR, so an older broad policy can override these restrictions. Existing profile-photo policies must remain limited to `profile-photos` and the owning user's folder.

The owner must audit RLS flags for every application table using the migration diagnostics. Enable RLS in the dashboard for any application table that reports false. Do not disable existing RLS or bypass role checks.

Reference: https://supabase.com/docs/guides/storage/security/access-control and https://supabase.com/docs/guides/storage/schema/helper-functions.
