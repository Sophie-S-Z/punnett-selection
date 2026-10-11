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

## Caption-first experience (TA feedback, 2026-10-10)

Open / to create AI captions for any uploaded image. Google sign-in is required to generate or vote.
Upload a photo, screenshot, or meme, optionally add tone/context, and generate four original captions.
Every result shows its image. Copy a caption or download an image with its caption as a PNG meme.
Compare captions in /?mode=duel. A and B choose a caption; S skips.
Paired votes persist atomically and never show an already judged caption to that user.
Open /lab/notebook for image-and-caption history with Chosen/Passed verdicts and timestamps.
The previous species catalog and discovery remain available at their existing routes as historical extensions, outside primary navigation.
Earlier personal organism collections are available at /lab/notebook/collection.
The general upload flow does not require the species catalog or discovery APIs.
Image generation is optional in the assignment and is outside this revision.
Read docs/caption-pivot-report.md for verification and remaining live acceptance.

Use `main` for production.
Keep environment values in `.env.local` and Vercel settings.
Read `AGENTS.md` before changes.
