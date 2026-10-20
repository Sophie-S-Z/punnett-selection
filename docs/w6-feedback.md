## Milestone

W6: implement Ibrahim's live-review feedback for Selection.

## What changed

The owner supplied two specific corrections: the optional profile photo blocked saving without a photo, and leftover specimen IDs appeared in caption views.

Empty multipart file entries now skip optional photo validation regardless of their placeholder filename. A real nonempty file still receives the existing type, size, content, and dimension checks. Name-only saves continue passing a null new-photo path, preserving an existing avatar in the database.

Creation results, paired voting, and both caption histories now use descriptive caption labels without specimen IDs. PNG downloads use punnett-meme.png. Saved image context, voting, history, copy, and download behavior remain available.

## How I verified it

Lint, strict application/test TypeScript, all 35 unit/database tests, and the production build pass. A new multipart regression covers absent fields and empty files with empty, blob, undefined, and photo.jpg filenames. The exact existing profile SQL passes isolated PostgreSQL tests for saving a new profile without a photo and preserving an existing photo during a name-only edit.

Real public-caption browser checks pass: the voting cards say Caption A and Caption B and show no specimen code; visitor voting remains locked; anonymous and cross-origin mutations remain denied. The authenticated history regression is included but requires a real Google session. Fresh-account sign-up and a no-photo save in the deployed browser are still pending acceptance. Isolated database success does not prove live onboarding.

## VERIFY findings (schema, API)

The existing profile RPC accepts a null avatar_path_input and retains the current avatar with coalesce. No SQL migration or RLS change is needed for these fixes. Model integration is unchanged.

## HUMAN tasks needed

The owner authorized the agent to perform the former HUMAN-only setup steps on 2026-10-20. Actual account interactions still require an available authenticated session. No password, token, browser session, or other credential is requested in chat.

## Open questions

Final deployment URL and production acceptance will be recorded after the release. The fix covers the identified empty-file path; a fresh live onboarding save still needs verification before claiming the entire reported signup issue resolved end to end.
