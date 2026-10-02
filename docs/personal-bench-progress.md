## Milestone

W3 extension: profile identity, personal specimen collection, and interface refinement.
Database setup and the signed-in local flow passed.
Production deployment verification is pending.

## What changed

- The header shows the signed-in user's saved first name and private profile photo.
- The profile link uses an initial if no photo exists or the image cannot load.
- The notebook route now contains a personal lab bench.
- Users can create specimens or copy shared specimens into their own collection.
- Users can edit names and notes, or confirm removal from their collection.
- Bench records live in a separate table. No action writes to `lab_specimens`.
- Database functions use `auth.uid()` for ownership. The client sends no owner identifier.
- Revision checks reject stale edits and removals. Stable ids make retried adds safe.
- Profile saves refresh the layout so the header receives the updated identity.
- Shared specimens use a responsive two-column layout. Forms and collection tools retain the Punnett night palette.

## How I verified it

On 2026-10-01:

- `npm run build` passed.
- `npm run lint` passed.
- `npx tsc --noEmit` passed.
- All 12 unit tests passed.
- All eight Playwright tests passed against the local production server.
- Public pages passed WCAG A/AA scans and overflow checks at 320, 390, 768, and 1440 pixels.
- Visitor route guards, malformed cookies, callback errors, and the exact OAuth callback passed.
- Desktop and mobile screenshots were inspected.
- A read-only query returned 11 shared specimens. Their values were saved locally for comparison after the signed-in CRUD test.

The signed-in local flow passed through the actual UI.
A temporary specimen was added, edited, reloaded, and removed.
A real shared specimen was copied to a personal row, reloaded, and removed.
Only the agent's two temporary entries were removed.
The owner's collection was preserved.
The header displayed the saved first name and successfully loaded the private photo.
The signed-in bench showed no horizontal overflow at 320 and 1440 pixels.
The owner also confirmed that the full local flow works.
All 11 shared specimens matched the saved baseline after the CRUD tests.
Anonymous requests to every bench function and the private table were rejected with HTTP 401 / 42501.
Ownership predicates were reviewed in all three SQL functions.
A second-account isolation test has not been performed.
Pending: production deployment and signed-in deployed verification.

## VERIFY findings (schema, API)

Existing shared columns remain `id, code, label, notes`.
The app reads the shared table only.
The new schema is defined in `docs/personal-bench.sql`.
It creates `public.punnett_bench_specimens` with UUID identity, owner, label, notes, revision, and timestamps.
Direct API-role table privileges are revoked.
Three owner-checked functions provide list, save, and delete operations.
No RLS policies are created or modified.
Anonymous security tests now cover these functions and direct bench-table access.
The owner confirmed that the table and all three functions exist.
The live anonymous security tests passed after setup.
The owner approved the add-specimen empty state for the personal table only.

## HUMAN tasks needed

1. At deployment, keep Vercel deployment protection off.
2. Add the new immutable deployment's exact `/auth/callback` URL in Supabase.
3. Confirm the deployed signed-in flow.

## Open questions

No product or schema questions remain.
The remaining production checks must pass before delivery is marked complete.
