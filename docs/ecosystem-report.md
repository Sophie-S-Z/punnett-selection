## Milestone

Expand Selection into a living comedy ecosystem with individual survival ratings, retained paired-caption judgments, broader organism variety, and source-backed discovery.

## What changed

The default feed presents one field note with Thrives (+1), Extinct (-1), and Keep observing (no vote).
The ratings judge descriptions, not the biological worth of the organism.
Each rating inserts one persisted owner-derived vote.
Paired-caption mode remains available and inserts two opposing votes atomically.
Both modes share the same unique owner/caption constraint and judged-ID exclusion.
The feed samples organisms before captions and avoids the last organism when alternatives exist.
Fitness is the proportion of positive votes, displayed only after five observations.
All counts come from live database responses.

Nine real Gemini cultures add 36 descriptions for previously uncultured catalog organisms.
The additive owner seed script gives all 11 existing organisms caption material, for 44 total descriptions before further user cultures.
Source records and existing votes are preserved.
Seed publication is idempotent.
Owner-only editorial seed flags keep starter cultures out of the normal user generation quota.
The quota test permits ten real user attempts after eleven starter cultures and rejects attempt eleven; failed user attempts still count.

The discovery station proposes one real animal, plant, or fungus at a user's request.
It requires an exact, accepted species match in GBIF and a Wikipedia summary that names the same scientific binomial.
The user reviews source facts and links before publishing.
Publication saves the organism, discovery prompt, source revision, generation prompt, culture reference, and real captions.
The catalog insertion and culture completion occur in one transaction.
Failed publication leaves the source proposal available for retry.
The proposal URL restores that owner's saved dossier after refresh.
The taxonomy/source checks establish identity and provenance; they do not constitute expert scientific fact-checking.
Wikipedia excerpts include attribution and CC BY-SA links.
Public provenance excludes private owner identities.

The interface uses Space Grotesk display type, IBM Plex body type, and JetBrains Mono readouts.
It has refractive glass, holographic accents, pointer spotlights, and an original procedural WebGL culture shader.
The shader stops offscreen and in hidden tabs, caps its render rate, and uses a static fallback for reduced motion, unavailable WebGL, or context loss.
Mode navigation uses normal links with current-page indicators.
Original styling takes inspiration from Aceternity's Card Spotlight and HeroUI's segmented navigation.
No paid components or new styling framework were introduced.

## How I verified it

TDD covers survival authentication, owner isolation, duplicate protection across modes, fitness thresholds, organism sampling, and exact SQL pagination across 1,001 captions.
Discovery tests reject malformed taxa, fuzzy/higher-rank matches, mismatched summaries, unsafe source links, cross-owner access, quota bypasses, partial publication, and duplicate retries.
The exact seed SQL is tested against PostgreSQL with real generated outputs and an idempotent rerun.
The full lint, application/test TypeScript, 54 unit/PostgreSQL tests, and production build passed during integration.
Public local browser checks passed across 320, 390, 768, and 1440 pixels, including both rating modes, catalog accessibility, visitor guards, shader loss, reduced motion, and anonymous/cross-origin survival rejection.
Optional authenticated automation tests are explicitly skipped without a real session.
The real provider discovery check produced Bobbit worm (Eunice aphroditois), GBIF key 5198482, a matching Wikipedia revision, and four validated Gemini descriptions.
Its exact public prompts and outputs are recorded in discovery-provider-check.json.
That provider check did not publish database rows.
Owner SQL application and live deployment acceptance remain pending.

## VERIFY findings (schema, API)

The survival extension reuses punnett_caption_votes with smallint values -1 and +1 and unique (owner_id, caption_id).
The source catalog remains lab_specimens with bigint ID and saved code, label, and notes.
Discovery allocates new catalog IDs under a table lock and synchronizes any identity sequence.
New proposal rows are private, with direct API table privileges revoked and owner-run RLS enabled.
Narrow RPCs enforce authentication, ownership, quotas, and publication status.
Discovery permits three attempts per 24 hours and three culture attempts per proposal, with a 60-second retry cooldown.
No policy statements or service-role credentials are used.
External URLs are constructed on the server from validated binomials; model-supplied URLs are never fetched.
GBIF and Wikipedia response formats were verified against live documented endpoints.
Source links: https://techdocs.gbif.org/en/openapi/v1/species and https://www.mediawiki.org/wiki/Wikimedia_REST_API.
Design references: https://ui.aceternity.com/components/card-spotlight and https://heroui.com/en/docs/react/components/tabs.

## HUMAN tasks needed

Run ecosystem-rating.sql, ecosystem-discovery.sql, and ecosystem-seed.sql in that order in the Supabase SQL editor.
Confirm the discovery table reports RLS enabled and the expanded feed returns 11 organisms and at least 44 descriptions.
Keep Vercel deployment protection off.
Add the new commit-specific deployment's exact /auth/callback URL when supplied.

## Open questions

The owner-run SQL, fresh live survival rating, fresh discovery publication, refresh persistence, and deployed signed-in acceptance remain open.
