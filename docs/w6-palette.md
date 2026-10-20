## Milestone

W6: share the new Punnett palette with Observatory.

## What changed

Replaced the charcoal/coral palette with aubergine ink (#181522), plum surfaces (#242032), lilac text (#F4EDF9), apricot accents (#FFBE98), periwinkle (#B4C5FF), and lavender paper (#E8E4F3). All changes use existing CSS tokens. Caption generation, voting, history, and the optional-photo fix retain their existing behavior.

## How I verified it

Lint, strict application/test TypeScript, 35 unit/database tests, and the production build pass. Nine public Chrome checks passed, including WCAG/overflow checks at 320/390/768/1440px, protected-route redirects, OAuth errors and exact callback construction, and caption labels without specimen IDs. The signed-in history case skipped because this runner has no Google session. The browser runner exited successfully. A production-build screenshot was visually inspected.

## VERIFY findings (schema, API)

This update changes only the palette and this report. It requires no schema, auth, API, or environment change and makes no paid model calls.

## HUMAN tasks needed

Keep deployment protection off. Add the newly deployed immutable origin's exact /auth/callback to Supabase Redirect URLs if it is not already allowed. Existing URLs must remain allowed.

## Open questions

Fresh-account optional-photo onboarding and authenticated history are not newly verified by this palette update. Production receipt URLs are recorded after publishing.
