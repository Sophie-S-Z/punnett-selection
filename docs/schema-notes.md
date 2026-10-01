# Schema verification

## W2

The local Supabase URL and anon key are configured in ignored `.env.local`.
A read-only request to `public.lab_specimens` first returned HTTP 200 with `[]`.
After the owner saved a public read policy, the same select returned six rows.
The page shows `LAB-001` through `LAB-006`.

Query used by `/specimens`:

```ts
supabase.from("lab_specimens").select("id, code, label, notes").order("id")
```

The API accepted `id`, `code`, `label`, and `notes`.
The response contains `id`, `code`, `label`, and `notes` for each row.
No RLS policies were created or changed by this repository.

## W3 (2026-10-01)

The owner ran `docs/w3-profiles.sql` in the existing staging database.
The final diagnostic confirmed `profiles`, the signup trigger, and the photo bucket.
Both name columns are nullable.
The creation script defines `id` as a UUID linked to `auth.users.id`.
Photo contents live in the private `profile-photos` Storage bucket.
The relational row stores only `avatar_path`.
The application uses `punnett_get_profile()` and `punnett_save_profile(first_name_input, last_name_input, avatar_path_input)`.
Both functions use the authenticated caller's `auth.uid()`.
The name fields are limited to 100 characters.
Direct table privileges are revoked from anonymous and authenticated API roles.
An anonymous table read returned HTTP 401 with PostgreSQL code 42501.
An anonymous profile-function call also returned HTTP 401 with code 42501.
The public Storage object endpoint returned `NoSuchBucket` for the private bucket.
The owner configured Storage policies.
No policies were created or changed by the agent.
The owner verified Google login and confirmed that names and a photo persist after reload.

Google Auth settings now report `external.google: true`.
The Google client secret is configured in the provider dashboard only, as explicitly authorized by the owner.
OAuth uses PKCE and the app redirect is exactly `/auth/callback`.
The callback exchanges the code and redirects to `/`.
Home then redirects incomplete profiles to `/profile`.

Next.js 16 uses `src/proxy.ts` for session refresh and route interception.
The helper remains at `src/lib/supabase/middleware.ts`.
Each protected page and the profile-save action check authentication on the server.

The current assignment's gated UI opens the private notebook.
The notebook reads existing `lab_specimens` data.
Caption duels and vote history remain separate W4 work and are not simulated.
