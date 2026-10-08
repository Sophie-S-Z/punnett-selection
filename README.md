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

Sign in with Google and open `/incubator` to upload an image and generate captions.
Send the completed culture to the selection chamber.
Select with a click, A, or B.
Press S to skip.
Each selection stores opposing votes for two captions from the same image.
Open `/lab/notebook` to review your saved selections.

Use `main` for production.
Keep environment values in `.env.local` and Vercel settings.
Read `AGENTS.md` before changes.
