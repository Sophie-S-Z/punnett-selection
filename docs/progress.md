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
The production alias renders six specimen cards from the live query.
The home page still loads.

# VERIFY findings (schema, API)

`public.lab_specimens` accepts the four-column select.
The public page now renders six saved rows.

# HUMAN tasks needed

Add the three environment variables in the Vercel project if a new Vercel project is created.
Turn off Vercel deployment protection (R4).
There is no negotiator agent in this repository.

# Open questions

None. The earlier empty result was resolved by the owner's public read policy.
