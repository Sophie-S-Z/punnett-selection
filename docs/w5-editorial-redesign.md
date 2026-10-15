## Milestone

W5: editorial redesign and original Punnett identity, 2026-10-15.

## What changed

Replaced the laboratory palette with warm charcoal, coral, cream paper, and lavender. Rebuilt the cover, tool navigation, image editor, voting cards, history, profile surfaces, and mobile layouts as one system. Removed obsolete laboratory and glass-effect CSS. Added an original caption-bubble grin in the header, SVG favicon, ICO fallback, and Apple touch icon. Global navigation identifies Create, Vote, and History correctly, including image comparisons. Kept native accessible controls and free Motion interactions with static reduced-motion fallbacks. No additional dependencies.

## How I verified it

`npm run check`: lint, strict TypeScript, 33 unit/PostgreSQL tests, and production build passed. Browser acceptance on the initial redesign: 17 passed; three authenticated automation cases intentionally skip without exported Google credentials. The four viewport checks (320/390/768/1440) include automated accessibility scans, public image loading, visitor route guards, keyboard access, and reduced motion. Added icon HTTP/MIME and active-navigation acceptance. The final narrow-phone tone-grid refinement is included in the release; final immutable-deployment results are recorded in the release receipt.

Separate actual-session UI checks confirmed tone selection and its character budget, creation search (2 of 12 captions for coffee), saved image loading, profile fields, and no signed-in editor/profile overflow at 320px. This task changes presentation and navigation; the earlier approved live generation, paired-vote persistence, and PNG export remain recorded in w5-restructuring-report.md. No new generation or vote was submitted during the redesign.

## VERIFY findings (schema, API)

No schema, auth, caption API, or Storage changes. The existing v2 RPC and private Storage integration remain in place. All icons are served by Next.js file metadata conventions. Public project metadata confirms Vercel password protection, SSO protection, and trusted-IP restrictions are disabled. Design-source review and limits are in design-references.md.

## HUMAN tasks needed

Keep Vercel deployment protection OFF. If a new immutable submission origin is not covered by the existing Supabase redirect wildcard, add its exact `/auth/callback` URL. Do not append callback query parameters. Fresh-account signup, actual phone camera hardware, and independent owner readback of the saved prompt remain previous acceptance limits.

## Open questions

None block this visual release. Final deployment and production browser evidence will be reported with the exact source commit and immutable URL in the release receipt. Automated scans and successful checks do not guarantee the absence of every possible defect.
