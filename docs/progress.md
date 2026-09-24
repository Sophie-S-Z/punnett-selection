# Milestone

W2: public specimen list from `lab_specimens`.

# What changed

Added a server Supabase client and a dynamic `/specimens` page.
The page selects `id, code, label, notes` and renders each row as a `SpecimenCard`.
An error from the query is shown on the page.
An empty result shows "No specimens in this dish yet."
Added tests for the error, empty, and list states.

# How I verified it

`npm test`, `npm run lint`, `npx tsc --noEmit`, and `npm run build` passed.
The production server rendered `/specimens` from the live query.
The live query returned zero rows, so the page shows the empty state.
The home page still loads.

# VERIFY findings (schema, API)

`public.lab_specimens` accepts the four-column select and returns HTTP 200 with `[]`.
No row payload was available to confirm column types.

# HUMAN tasks needed

Add 5 to 8 rows to `lab_specimens`, or confirm anonymous read access if rows already exist.
Add the three environment variables in the Vercel project.
Turn off Vercel deployment protection (R4).
There is no negotiator agent in this repository.

# Open questions

Whether the zero-row response is an empty table or RLS filtering.
