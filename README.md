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

Use `main` for production.
Keep environment values in `.env.local` and Vercel settings.
Read `AGENTS.md` before changes.
