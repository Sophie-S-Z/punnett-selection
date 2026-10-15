# Week 5 assignment audit — 2026-10-15

## Milestone

Week 5: feedback implementation, usability, and production acceptance. The rubric has 100 base points and up to 5 discretionary bonus points. A score is the instructor's decision, not a result of automated tests.

## What changed

The instructor feedback supplied by the owner asks for mass-audience humor and memes, plain language, and images alongside history captions. The released caption studio implements that direction. Create, Vote, and History replace the organism discovery flow. Users upload an everyday image, choose optional tone/context, receive real Gemini captions, compare pairs, and retain both chosen and passed captions with their images. Copy and PNG meme export give the output a use beyond the rating session. Image generation is optional and is not needed for this assignment.

This audit adds two focused improvements. A successful vote followed by a failed next-pair request explicitly reports that the vote is recorded and links to vote history. Generated results receive keyboard focus and scroll into view, with instant scrolling for reduced motion. Editor copy no longer promises exactly four results when the verified API accepts two to six.

## How I verified it

The starting production release is source `65e9059e56ade477851bd1a5a255b7e9cb2b1a56`, Vercel deployment `dpl_6f2D7BRTip6HuyGtmkM7uWa9uHFc`. Its immutable URL is https://punnett-selection-m4kkdzofp-sophie-zhangs-projects.vercel.app/.

- Production browser acceptance: 17 passed, 3 authenticated automation cases skipped because no Google session was exported. Checks cover real public images/captions, navigation, icons, 320/390/768/1440px overflow and WCAG A/AA scans, reduced motion, protected routes, malformed cookies, callback failure, exact current-origin OAuth callback, anonymous vote denial, and cross-origin rejection.
- Live anonymous authorization suite: passed. Private reads, direct rating-table access, generation, and voting reject anonymous callers. Public caption reads work.
- Required local gates after the fixes: lint, application/test TypeScript, all 33 unit/PostgreSQL tests, and production build passed. Isolated database tests cover atomic opposing votes, duplicate rollback, ownership, quota, storage cutover, and pagination. These are distinct from live signed-in tests.
- Current signed-in production UI: protected editor and 12 saved creation captions load. Every history caption includes its original image, date, copy/export controls, and a comparison link.

Final release URL and post-release checks are recorded separately in the release receipt. A skipped authenticated automation test is not a pass. Earlier real generation, persistence, and export evidence is in `w5-restructuring-report.md`; this audit does not relabel that earlier evidence as a new generation test.

## VERIFY findings (schema, API)

Vercel's current project response confirms password protection, SSO protection, and trusted-IP restrictions are disabled. Production is Ready and points to the exact source above. Public live caption/image reads succeed. No schema or policy changes are needed for these fixes. Authentication remains server checked and the existing atomic vote RPC remains unchanged. No course API endpoints were guessed. The owner-authorized Gemini contract remains documented in `caption-api.md`.

## HUMAN tasks needed

Keep deployment protection OFF. Submit the immutable release URL, not only the moving production alias. Complete an actual phone camera check and a fresh-account Google signup check; existing-account access does not prove either. The owner manages any callback allowlist or dashboard configuration required by a new deployment origin, per AGENTS.md sections 0 and 3.

## Open questions

The supplied instructor feedback is addressed by the current product direction. Bonus points and visual/usability scores require instructor judgment. The UI intentionally preserves the approved editorial design and plain-language pivot rather than reverting to the older laboratory terminology and palette in the original build spec. No claim is made that automated scans prove every possible accessibility or usability issue absent.
