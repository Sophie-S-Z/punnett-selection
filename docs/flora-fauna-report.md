## Milestone

Restore Punnett's real, bizarre flora/fauna/fungi theme throughout generation, the shared lab, and the private bench.

## What changed

The incubator chooses a real source from the live database and can select one at random.
The server re-reads that source and uses its saved facts, not client-supplied biological claims.
Each output preserves the organism's common name and scientific taxon.
Optional directions change tone only; optional photos supplement the source.
Without a photo, a clearly labelled fact card replaces the former website screenshots.
Descriptions require distinct original punchlines without invented biology.
Private bench names must match the real public catalog; personal factual field notes remain editable.
The owner-run content correction backs up shared and private records, updates all 11 public entries and matching bench copies, and replaces the known Testing placeholder with the exploding ant.
It archives the two website cultures without deleting their images, captions, or votes.
Archived test votes do not appear as ratings of the new organisms.
Eight real Gemini captions are stored as new, unjudged cultures.

## How I verified it

TDD covers named-taxon generation, off-theme rejection, source identity, escaped fact-card rendering, and the exact transactional SQL correction.
The correction test verifies private backups, preserved votes, exclusion of archived history, eight active biological captions, and no duplicate seed cultures on rerun.
All 42 unit/PostgreSQL tests passed, along with lint, application/test TypeScript, and the production build.
Source commit 895acc8611aca3f48f611dfb44f801ab29217b67 is deployed as Ready at https://punnett-selection-5la2wtwrk-sophie-zhangs-projects.vercel.app.
GitHub CI passed.
The deployed security checks passed.
The deployed browser suite passed 14 tests, with three optional authenticated automation tests explicitly skipped.
Responsive accessibility and overflow checks passed at 320, 390, 768, and 1440 pixels.
The owner confirmed the live content correction succeeded and the exact deployment callback was allowlisted.
Live readback matches all 11 proposed public labels and notes.
The public caption RPC returns eight biological captions and no website captions.
The security and 14 public browser checks passed again after the repair.
Fresh desktop and mobile screenshots show the repaired chamber.
Signed-in checks on this corrected deployment remain pending; the in-app browser connection times out when attempting login.

## VERIFY findings (schema, API)

The live public lab has 11 entries; each already identifies a real organism or group.
The verified names, facts, official sources, and removed unsupported claims are in flora-fauna-content.json.
Sea cucumbers are a class; evisceration and regeneration vary by species.
Fungi are explicitly included and are not classified as plants.
The hairy frog's updated genus follows AMNH's current reference.
The generation and voting schema remains unchanged.
No policy statements or service-role credentials are used.
The new backup table has revoked API privileges and owner-enabled RLS.

## HUMAN tasks needed

Keep deployment protection off.
Confirm the private bench correction, fresh organism generation, and two persisted opposing votes after notebook reload on the corrected deployment.

## Open questions

The public repair is verified.
Private live readback and authenticated generation/voting acceptance remain open.
