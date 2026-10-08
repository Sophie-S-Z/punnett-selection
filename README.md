# Punnett Selection

The Humor Project. Columbia University. Fall 2026.

## Development

Use Node.js 24 and npm.
Run `npm ci` and `npm run dev`.

## Required checks

Run `npm run build`, `npm run lint`, and `npx tsc --noEmit` before each push.
Run `npm run check` to run lint, generated route types, TypeScript, unit tests, and the production build in order.
Lint fails on warnings.
GitHub Actions runs lint, TypeScript, and unit tests without database secrets.
Run `npm run test:e2e` against a running app for browser and accessibility checks.
Production build and live browser checks remain required before deployment.

## Milestones

W1: Public Next.js landing page.
W2: Public `/specimens` list from `lab_specimens`.
W3: Google authentication, profiles, and an owner-scoped personal bench.
W4: Paired caption selection, vote history, and real Gemini image captions.

## Rating app setup

Copy `.env.example` to the ignored `.env.local` file.
The owner configures Supabase and the server-only Gemini key in local and Vercel environments.
The owner runs `docs/w4-rating.sql` in the existing Supabase project.
The script creates app-owned tables and authenticated RPCs without changing RLS policies.
Read `docs/schema-notes.md` and `docs/caption-api.md` for the verified contracts.

Sign in with Google and open `/incubator` to choose a real flora, fauna, or fungal specimen from the live public lab.
Pick a random specimen for an unexpected organism.
Generate funny field notes from its saved facts; a field photo is optional.
Each caption preserves the common name and scientific taxon.
The selection ecosystem shows one field note by default.
Rate Thrives with T or Extinct with E; press S to skip without writing a vote.
Each survival rating stores one vote.
Switch to Paired captions to compare two descriptions from the same culture with A or B.
Each paired judgment stores two opposing votes atomically.
Both modes exclude captions you have already rated.
The fitness readout appears after five total ratings.
Open `/lab/notebook` to review your saved selections.
Private bench names also come from the public catalog; personal field notes remain editable.
The owner runs `docs/flora-fauna-correction.sql` to repair existing public/private content and archive the website test cultures with their votes preserved.

For the expanded ecosystem, the owner runs `docs/ecosystem-rating.sql`, `docs/ecosystem-discovery.sql`, and `docs/ecosystem-seed.sql`, in that order.
The additive seed provides real Gemini descriptions for all existing catalog organisms.
Owner-only editorial seed flags prevent starter cultures from consuming the user's daily generation allowance.
Normal pending and failed user attempts still count toward the ten-culture daily limit.

Open `/discover` after sign-in to propose a new real species.
The server checks its scientific identity against GBIF and retrieves matching Wikipedia source facts.
Review the dossier and source links, then culture and release the organism and descriptions together.
Publication saves prompts, taxonomy key, source revision, and culture in the database.
The saved proposal URL survives refresh and remains owner-scoped.
Discovery allows three attempts per day and three culture attempts per proposal, with a one-minute retry cooldown.
Read `docs/ecosystem-report.md` for implementation and acceptance evidence.

Use `main` for production.
Keep environment values in `.env.local` and Vercel settings.
Read `AGENTS.md` before changes.
