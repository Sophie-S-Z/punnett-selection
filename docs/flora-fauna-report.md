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
Live deployment and owner-run correction evidence will be recorded below.

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

Run flora-fauna-correction.sql in the Supabase SQL editor and confirm its successful diagnostics.
Keep deployment protection off.
Add the new immutable deployment's exact /auth/callback redirect entry when supplied.

## Open questions

The live content correction and deployed authenticated generation must pass before this task is complete.
