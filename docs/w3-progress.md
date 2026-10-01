## Milestone

W3: Google authentication, profile onboarding, photo upload, and a protected route.
Application delivered and verified on the commit-specific production deployment.
The required video review remains unverified because the caption endpoint returned no content.

## What changed

Added Google sign-in, sign-out, and the exact `/auth/callback` code exchange.
Added server session refresh with Next.js 16 `proxy.ts`.
Protected `/profile`, `/profile/photo`, `/lab/notebook`, and the future `/incubator` path.
Each protected page and profile-save action also checks authentication on the server.
Added a gated notebook section on the public home page.
The private notebook reads real `lab_specimens` rows.
Added profile onboarding when either name is missing.
Added a profile editor with names and optional private photo uploads.
Photo files are checked for type, size, dimensions, and valid image contents.
Only the photo path is stored in the relational table.
Added current-user database functions and a signup trigger in `w3-profiles.sql`.
The owner executed the migration and configured Google and Storage access.
No RLS policies were created or changed by the agent.

## How I verified it

Nine unit tests passed.
Eight isolated-browser checks passed.
The browser checks cover 320px, 390px, 768px, and 1440px layouts.
There was no horizontal overflow or page JavaScript error on the public pages.
Automated axe scans found no tested WCAG AA violations.
This does not replace a full assistive-technology audit.
Visitor routes redirect to `/`.
A malformed session cookie does not bypass protection.
Google sign-in requests the exact current-origin callback and a PKCE challenge.
A cancelled callback returns a recoverable sign-in message.
Anonymous page submissions and profile read/write API functions are rejected.
The owner tested real Google login locally.
The owner confirmed that saved names and an uploaded photo persist after reload.
Build, lint, and TypeScript checks passed during implementation.
They are run again before the final source push.
The final build, lint, and TypeScript checks passed before the source push.
All eight browser tests also passed against the commit-specific Vercel URL in fresh browser contexts.
The deployed anonymous authorization checks passed.
The owner confirmed the complete deployed login, profile/photo persistence, notebook, and logout flow.
GitHub's successful Vercel status maps the source commit to deployment `dpl_7RNkZS3RYyKidhbS3dLmNqtogusP`.
The exact deployment is publicly reachable with HTTP 200.

Source commit: `a5d671a550edfc58ba83b70f5bc32c639667154e`.
Submission URL: https://punnett-selection-c2yydgpbd-sophie-zhangs-projects.vercel.app

## VERIFY findings (schema, API)

See `docs/schema-notes.md` for the verified profile contract and API permissions.
The creation diagnostic confirmed both name fields are nullable.
The signup trigger and private photo bucket exist.
Google authentication is enabled.
The Google secret is configured only in the Supabase dashboard, as authorized by the owner.
Current implementation references:
- https://supabase.com/docs/guides/auth/social-login/auth-google
- https://supabase.com/docs/guides/auth/server-side/creating-a-client
- https://supabase.com/docs/guides/auth/managing-user-data
- https://supabase.com/docs/guides/storage/security/access-control

## HUMAN tasks needed

Submit the verified commit-specific URL in the course portal.
Keep Vercel Deployment Protection off, as required by AGENTS.md R4.
The owner already added the exact deployment callback and confirmed deployed behavior.

## Open questions

The required YouTube page did not expose a transcript to the web tool.
The official English caption track was found, but its endpoint returned an empty response.
The video has not been verified as viewed.
Caption duels and vote history remain the later W4 milestone.
The current assignment's gate opens the notebook.
Photo cleanup after a network failure is best effort.
An uncertain profile-save response is read back before a potentially referenced photo is removed.
