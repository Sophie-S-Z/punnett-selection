# Week 3–5 restructuring report

## Milestone

Week 5: remove legacy biology content and align the app with image-based humor captions and voting. The caption studio is deployed and has passed public and actual-session production checks. The owner confirmed Step 1 setup. Final removal of the obsolete image column remains an owner task.

## What changed

- Removed species facts, discovery, survival voting, organism collections, their endpoints/components/helpers, and unused ecosystem styles.
- Old page bookmarks redirect to Create or caption history.
- Removed source-specific biological caption prompts and validation.
- Caption uploads now use private Supabase Storage; generation rows save object paths, exact prompts, and model identifiers.
- Added owner-scoped creation history so unvoted captions persist alongside their images.
- Preserved paired vote history with chosen/passed results, timestamps, copy, and meme download.
- Prepared selective legacy cleanup, owner-only transfer of recent meme images, and a final script that refuses to remove the binary column until transfer succeeds.
- Retained Google authentication, nullable profile names, first-login name completion, private profile photo upload, and server route/action guards.

## How I verified it

The final `npm run check` passes: lint, strict TypeScript, 33 tests, and production build. The selective migration test verifies preservation of recent memes, archive filtering, owner isolation, anonymous denial, exact prompt persistence, duplicate-vote rollback, and pagination over 500 captions. The migration refuses to drop embedded bytes until recent meme transfers succeed.

Eleven local production browser checks passed: responsive/accessibility checks at 320, 390, 768, 1440 pixels; reduced motion; navigation; visitor guards; malformed sessions; failed OAuth recovery; exact current-origin `/auth/callback` wiring.

These checks do not establish live Storage policy correctness or final deployed generation/voting.

## VERIFY findings (schema, API)

Live read-only audit on 2026-10-10: Google provider enabled; current public catalog has 68 real captions across 17 images, including 64 old biology captions and four recent general-humor captions. The new RPCs were absent (`PGRST202`) when checked. No live database-owner changes were performed by the agent.

Existing W3 docs record the owner-confirmed profile trigger, nullable names, private photo bucket, and successful profile readback. Those historical owner confirmations are distinct from a new-account acceptance test in this release.

Current migration reads Storage object metadata (`bucket_id`, `name`) and stores only paths for new uploads. Supabase's official Storage schema and access-control docs were checked. Current user identity comes from the server session and `auth.uid()`; no service-role key is used.

## HUMAN tasks needed

Apply the revised migration and private bucket/policies using `w5-owner-cutover.md`. Audit RLS flags across application tables. After the revised app transfers recent meme images, run `w5-finish-storage.sql`. Keep deployment protection OFF and allowlist the immutable deployment's exact callback.

The owner explicitly authorized only providing exact Storage policy conditions as an exception to AGENTS.md R1. The owner applies those conditions. All live policy and all-table RLS confirmations remain owner tasks.

## Open questions

See the dated deployed-acceptance entries below for completed production checks. New-account signup-trigger behavior, phone camera behavior on actual hardware, and provider free-quota status require their respective live checks. Do not claim the full Week 3–5 rubric is complete until these are verified.

## Owner-confirmed setup and studio release — 2026-10-15

The owner confirmed all of Step 1, including existing-policy review and RLS flags. Anonymous RPC probes now confirm the v2 generation and legacy-image transfer functions exist and reject anonymous execution with 401/42501. Anonymous security tests pass.

An existing signed-in Sophie session opened the revised local production home. The owner-scoped transfer restored the recent image and all four captions. All four history images loaded. A separate anonymous GET of the migrated image returned HTTP 200, image/jpeg, 41,197 bytes. No old biology caption appeared in the current creation history.

A real paired selection persisted after a full history reload. Both chosen and passed captions remained associated with the image. Search returned two of four captions for the query 'brain'; the Chosen filter returned two of four vote entries. These are actual database operations, not mocks. The final binary-column removal remains an owner task via w5-finish-storage.sql.

The studio redesign adds an annotated headline, layered upload interaction, optional tone presets, a bounded context counter, history search/verdict filters, and simpler surfaces. Component sources and adaptation scope are recorded in design-references.md. No paid assets or additional UI dependencies are installed.

Final lint, strict TypeScript, all 33 unit/PostgreSQL tests, and production build pass. The local production browser suite passes 16 tests, with three authenticated automation cases skipped because no session was exported. Separate actual-session checks above cover migration, history, and paired-vote persistence. Fresh provider generation and final deployed acceptance are separate checks.

## Deployed acceptance — 2026-10-15

Source 359500def569e1ad981393fe2406f666611ba095 deployed Ready as dpl_CnkGtWG8pCqN2kbyzCQBoUudEiCT at https://punnett-selection-2t66dz4tm-sophie-zhangs-projects.vercel.app/ and the production alias. The exact immutable deployment passes 16 browser checks (three optional authenticated automation cases skipped) and the anonymous live security suite.

The existing Google session works on the production alias. With explicit owner approval, a nonpersonal desk/coffee test image was uploaded through the deployed UI. Dry tone and the context were selected; real Gemini generation returned four saved captions for image 6ce9c7c2-b0e3-4257-bf60-c56971d874a6. A paired vote persisted as Chosen/Passed entries after a full reload. PNG export succeeded at C:\Users\Sophi\Downloads\punnett-AGAG-7252.png. No browser session or credential was exported.

An additional solid-primary-button refinement follows this code deployment. Fresh Google login at a new immutable origin still requires its exact /auth/callback allowlist entry; the existing production Google session is distinct from a new-account signup test. Phone camera on actual hardware and the owner-run final binary-column removal remain pending owner checks.

## Cutover completed — 2026-10-15

The owner confirmed w5-finish-storage.sql succeeded after transfer verification. The obsolete binary image column is removed; image files live in Storage and application rows retain paths. The final code polish is 0b0e9ee; later documentation-only commits do not alter its UI/server behavior. All three owner cutover steps are now complete. Remaining limitations are a fresh-account signup test, actual phone camera hardware acceptance, and an independent owner readback of the exact saved prompt; the exact prompt persistence contract is covered by PostgreSQL tests.
