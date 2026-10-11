## Milestone

W5 / Project 1: caption-first restructuring from TA feedback, 2026-10-10.
Implementation is complete. Signed-in live acceptance remains pending.

## What changed

- Home leads with image uploads and AI humor captions. Create and Vote form the primary navigation.
- Generic meme prompts replace required organism identity and natural-history constraints in upload generation.
- Upload photos, screenshots, or memes with optional tone/context, drag-and-drop, camera input, validation, and recoverable quota errors.
- Plain-language voting preserves same-image, unjudged pairing and atomic opposing votes.
- Generated captions and history show the original image. Chosen and passed votes include timestamps.
- Copy caption and download PNG meme controls use the saved image and caption.
- Earlier private organism collections remain available under history. Catalog and discovery retain their routes outside primary navigation.
- Optional image generation and smile mode are outside this revision.

## How I verified it

npm run check passed: lint, strict TypeScript including test types, 55 tests, and production build.
Live Supabase security checks passed. Anonymous mutations and private reads are rejected; public captions remain readable.
Production browser checks cover responsive accessibility, create/vote navigation, Google callback, visitor guards, reduced motion, media, and image preparation. Final counts are recorded below.
Signed-in tests require a real Google session. Their skipped state is not a live generation or persistence claim.
Local Turbopack development hit an internal next/font resolution error. Production build and server work, and browser acceptance uses the production server.

## VERIFY findings (schema, API)

Vote history already includes imageId. Generation and image-read RPCs support this flow without a migration.
The documented Gemini generateContent integration is retained. No course endpoint was guessed.
See docs/schema-notes.md and docs/caption-api.md.

## HUMAN tasks needed

Sign in on the deployed site. Upload a non-biological image, generate captions, compare a pair, reload history, verify both images/captions/verdicts, copy a caption, and download a meme.
Test camera input on an actual phone.
Keep Vercel deployment protection off. Dashboard changes remain owner tasks under AGENTS.md R4.

## Open questions

No implementation questions. Signed-in acceptance and provider quota availability remain unverified.

## Final automated evidence

Final npm run check passed: lint, TypeScript, all 55 tests, and production build.
Chrome production acceptance completed with 17 passed and 3 skipped authenticated cases.
All tested widths (320, 390, 768, 1440) passed overflow and WCAG A/AA scans.
Live anonymous Supabase authorization checks passed.
Vercel project settings were read before deploy: password protection, SSO protection, and trusted IP restrictions were all disabled.

## Deployment evidence

Initial restructuring source: 7feda701f645868f8cd4b022e57930838fcd36cc.
Vercel deployment dpl_DaFa59GQrCuanNPLgZRJpdnx6bYS reached Ready and aliased https://punnett-selection.vercel.app/.
Initial immutable URL: https://punnett-selection-c5ed400bs-sophie-zhangs-projects.vercel.app/.
Final visual review also identified and fixed inherited grid wrapping in the Create/Vote tabs.
Final public browser acceptance is performed after publishing the polish.
