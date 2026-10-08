## Milestone

W4: real caption generation and paired selection.
The local authenticated workflow has passed live acceptance.
The assignment is not ready to submit until the deployed workflow passes.

## What changed

Replaced the welcome screen with a real Supabase caption chamber.
Pairing reads all captions and judged ids in pages of 500.
It selects two unjudged captions from one image.
Visitors observe behind a locked glass pane.
Authenticated users select with a click, A, or B, and skip with S.
One database transaction records opposing votes and rejects repeat judgments.
The notebook lists the user's persisted votes newest first and preserves the personal bench.
The protected incubator accepts images, camera input, and generation instructions.
It compresses images locally, verifies them on the server, calls Gemini, and saves images, full prompts, model identifiers, and captions.
Generation has bounded output, a 45-second provider timeout, and a rolling 10-attempt limit per user per 24 hours.
Errors release controls and permit recovery.
The interface uses glass surfaces, teal/lilac interference highlights, a DNA mark, and reduced-motion transitions.
Exact versions of the free motion and Sonner packages are pinned.
Next.js and its ESLint configuration were updated to security patch 16.3.8.
Lint rejects warnings.
The combined quality command checks application and test TypeScript, unit/PostgreSQL tests, and the production build.
GitHub Actions checks lint, both TypeScript configurations, and the tests without live database credentials.

Visual references reviewed: https://ui.aceternity.com/components and https://heroui.com/llms.txt.
The visual treatment uses original CSS and SVG within the existing stack.
Product decisions and the supplied rubric are recorded in docs/w4-product-notes.md and docs/w4-rubric.md.

## How I verified it

Tests were written before pairing, response-validation, generation-helper, and vote-protocol implementations.
All 38 unit and isolated PostgreSQL tests passed.
The exact owner migration executes successfully in the isolated PostgreSQL test engine.
Tests cover grants, all four RLS flags, ownership, public/pending boundaries, atomic rollback, duplicate votes, quota, and 500/500/1 pagination.
The owner confirmed successful setup and all four live RLS flags.
Live anonymous profile, bench, rating mutation, vote-history, and direct-table requests are rejected.
The public caption RPC returns HTTP 200.
The owner configured Gemini locally and in Vercel.
A real Google session in the in-app browser completed image upload and Gemini generation.
The app saved four actual generated captions from a public screenshot of its interface.
One selection produced a selected and a not-selected history row.
Both rows survived a full reload.
The next pair excluded the two judged captions.
The existing personal bench remained intact.
The first provider test exposed a REST enum mismatch; the corrected APPLICATION_JSON value is regression-tested and the retry succeeded.
The final automated local browser suite passed 14 cases and explicitly skipped three optional storage-state cases.
Their real signed-in generation/voting acceptance was checked separately through the existing browser session.
Checks cover responsive axe scans, route/API authorization, exact OAuth callbacks, reduced motion, and actual browser image compression.
Final deployed evidence is recorded when available.

## VERIFY findings (schema, API)

The original configured project exposed none of the course caption tables.
The owner explicitly selected app-owned tables and Gemini instead of the unavailable course API.
The authoritative new schema is docs/w4-rating.sql.
Vote values are smallint +1 and -1.
The unique constraint is (owner_id, caption_id).
Audit fields are id and created_at with server defaults.
Each RPC derives ownership from auth.uid().
The full provider contract and official sources are in docs/caption-api.md.
The owner confirmed RLS configuration and deployment protection off.
The Vercel connector independently reports password, SSO, and trusted-IP protection disabled.
The agent created or changed no RLS policies.
Production dependency audit reports zero vulnerabilities.
Five development dependency audit findings remain in the existing ESLint fast-glob/micromatch/braces chain.
The registry has no compatible patched braces release; forced framework downgrades were not used.

## HUMAN tasks needed

Gemini configuration and database setup are confirmed complete.
Keep Vercel deployment protection off.
Allowlist the immutable deployment's exact /auth/callback URL if needed.
Confirm any requested new immutable callback allowlist entry.
The owner submits the verified commit-specific URL in the course portal.

## Open questions

Does the real upload-to-generation-to-selection flow pass on the immutable deployed URL?

The required production acceptance check remains open until deployment is verified.
