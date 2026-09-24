# Supabase setup for Assignment 2

## 1. Create the project

1. Open https://supabase.com/dashboard.
2. Sign in.
3. Select New project.
4. Select your organization on the Free plan.
5. Name the project `punnett-staging`.
6. Generate a database password.
7. Save that password in your password manager.
8. Choose a nearby region, such as US East.
9. Create the project.
10. Wait for provisioning to finish.

If your instructor provides a course staging project, use that project instead.
A new personal project does not include the course caption tables.

## 2. Create the assignment table

1. Open Table Editor.
2. Select New table.
3. Select the `public` schema.
4. Name the table `lab_specimens`.
5. Keep the default RLS setting enabled.
6. Configure the columns below.
7. Remove an automatically added `created_at` column if you want the exact four-column schema.
8. Save the table.

| Column | Type | Setting |
| --- | --- | --- |
| id | int8 | Primary key; identity; generated automatically |
| code | text | Specimen code |
| label | text | Short specimen name |
| notes | text | Observation |

## 3. Add real rows

1. Open `lab_specimens` in Table Editor.
2. Select Insert row.
3. Leave `id` to generate automatically.
4. Enter a code, label, and note of your choice.
5. Save the row.
6. Repeat until the table contains 5 to 8 rows.

Example content you can enter as an actual database row:

- code: `LAB-001`
- label: `The office mug`
- notes: `An ordinary mug under unusually serious observation.`

The application will read the saved database rows.
It will not use these examples as fallback data.

## 4. Confirm public-read access with the course owner

Your public page must be able to read this table with the anon key.
A new table with RLS enabled can return no rows until its access is configured.
The project rules prohibit this agent from creating, changing, enabling, or disabling RLS policies.
Ask your instructor or authorized database owner to confirm the course-approved anonymous read access for `public.lab_specimens`.
Do not disable RLS to work around an empty result.
Do not use a service-role key.

## 5. Add local environment values

1. Open the project Connect dialog or Project Settings.
2. Copy the Project URL.
3. Open Settings > API Keys.
4. Find the legacy `anon` key required by the class specification.
5. Do not copy `service_role` or a secret key.
6. Copy `.env.example` to `.env.local` in `punnett-selection`.
7. Fill the first two values.

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
NEXT_PUBLIC_CAPTION_API_BASE=https://api.almostcrackd.ai
```

If the dashboard only offers a publishable key, report that before proceeding so the class requirement can be checked.
The `.env.local` file is excluded from Git.
Do not put the database password in this file.

## 6. Add Vercel environment values

Do this after the Vercel project exists.

1. Open the `punnett-selection` project in Vercel.
2. Open Settings > Environment Variables.
3. Add the three variables above with the same values.
4. Apply them to Production, Preview, and Development.
5. Save the changes.
6. Tell the agent that the table, rows, and environment values are ready.

The next deployment must run after these values are saved.
The agent will verify the real schema, fetch the rows, build the list page, and check the deployed result.

## Sources

- Supabase Next.js quickstart: https://supabase.com/docs/guides/getting-started/quickstarts/nextjs
- Supabase API keys: https://supabase.com/docs/guides/getting-started/api-keys

Do not copy the quickstart's policy SQL into this project.
Use the class rules in AGENTS.md.
