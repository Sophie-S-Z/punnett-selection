# Deployment and submissions

## Restore CLI access

Run `vercel login` in a terminal.
Complete the login in your browser.
Tell the agent when it succeeds.

## Deployment protection: owner action

AGENTS.md R4 assigns this setting to the human owner.
After the project exists, open Vercel > punnett-selection > Settings > Deployment Protection.
Turn off Vercel Authentication for this class project.
Save the setting.
Open the exact deployment URL in an incognito window.
The page must load without a Vercel login.
A public production alias alone does not prove the commit-specific URL is public.

Reference: https://vercel.com/docs/deployment-protection

## Submission records

| Assignment | Commit | Immutable deployment URL | Status |
| --- | --- | --- | --- |
| 1 | Pending push | Pending deployment | Not ready to submit |
| 2 | 1eef337 | https://punnett-selection-o6syifci9-sophie-zhangs-projects.vercel.app | Deployed; six rows visible |
| 3 | a5d671a550edfc58ba83b70f5bc32c639667154e | https://punnett-selection-c2yydgpbd-sophie-zhangs-projects.vercel.app | Ready; public incognito tests passed; owner confirmed login, profile/photo persistence, notebook, and logout |
| 3 extension | 85c75f4d5f4dc98814ab8af0f0f93465b3746790 | https://punnett-selection-r7l4jjwzh-sophie-zhangs-projects.vercel.app | Ready to submit; public and security tests passed; owner confirmed the deployed signed-in flow |
| 4 | 23da9a40f41a7d230018ace69761657af48fe012 | https://punnett-selection-k6xhz9g4h-sophie-zhangs-projects.vercel.app | Ready to submit; public, security, responsive, and actual signed-in Gemini/voting flows passed |

The owner will submit the final URLs in the course portal.

## W3 evidence

The source commit is `a5d671a550edfc58ba83b70f5bc32c639667154e`.
Vercel deployment `dpl_7RNkZS3RYyKidhbS3dLmNqtogusP` is Ready.
GitHub's Vercel commit status is successful and points to that deployment.
The commit-specific URL responds with HTTP 200 without Vercel authentication.
All eight browser tests passed against that URL in fresh browser contexts.
Anonymous profile read/write API calls and protected page submissions were denied.
The owner added its exact `/auth/callback` URL to Supabase Redirect URLs.
The owner confirmed the full deployed flow passed.
The production alias is https://punnett-selection.vercel.app.
The immutable source deployment above is the submission URL.
Later documentation-only commits do not change that recorded source deployment.

## W3 extension evidence

Source commit `85c75f4d5f4dc98814ab8af0f0f93465b3746790` adds the personal bench and profile header.
Deployment `dpl_HKSs2jcmSBNKrPnqfHsEfEK1cGN1` is Ready.
GitHub reports a successful Vercel status for that source commit.
The new immutable URL is publicly reachable without Vercel authentication.
All eight browser tests passed against that URL in fresh browser contexts.
The deployed security tests rejected anonymous protected-page submissions, profile and bench functions, and direct private bench-table reads.
The owner confirmed the full local signed-in flow.
The agent verified local add, copy, edit, reload, and confirmed removal through the actual UI.
All 11 shared specimens were unchanged after those tests.
The owner saved the new immutable URL's exact `/auth/callback` allowlist entry in Supabase.
The owner confirmed the deployed signed-in test passed.
This source deployment is the verified submission URL for the extension.

## W4 evidence

Source commit: `23da9a40f41a7d230018ace69761657af48fe012`.
Vercel deployment: `dpl_Er4bGgcNTLQDUm19uKQx2YQYpXU1`.
Immutable submission URL: https://punnett-selection-k6xhz9g4h-sophie-zhangs-projects.vercel.app.
Vercel reports Ready and the exact source commit.
The deployment responds with HTTP 200 without Vercel authentication.
Protection is disabled; keep it disabled for course access.
The owner confirmed the exact immutable `/auth/callback` allowlist entry.
Google login and logout passed through the deployed UI.
The deployed generation action saved four real Gemini captions for image `b8452b2d-67bd-4600-8a25-775d77d51fa3`.
A selected pair recorded ATGG-4307 as selected and ACCG-7127 as not selected.
Both history rows persisted after a full reload.
The next pair excluded the two judged captions.
Logout restored the locked chamber and a direct notebook visit redirected to home.
The existing personal bench remained intact.
The anonymous security script passed against the deployment and live database.
The fresh-context browser suite passed 14 tests; three optional authenticated automation cases were skipped.
Responsive accessibility, overflow, and script-error checks passed at 320, 390, 768, and 1440 pixels.
Authenticated acceptance used normal browser UI; no session was exported.
All 38 unit/PostgreSQL tests, lint, application/test TypeScript, production build, and GitHub CI passed.
Production desktop/mobile screenshots are attached as task artifacts.
Later documentation-only commits do not change the recorded source deployment.

## Flora/fauna correction evidence

Source commit: `895acc8611aca3f48f611dfb44f801ab29217b67`.
Vercel deployment: `dpl_5UvJ4rgX5yVLRDneubDKMQYwF3cK`.
Corrected workflow URL: https://punnett-selection-5la2wtwrk-sophie-zhangs-projects.vercel.app.
Use this deployment for the organism workflow instead of the historical W4 deployment.
The owner confirmed its exact `/auth/callback` entry is saved.
The owner confirmed the content correction SQL succeeded.
Live public readback matches all 11 corrected labels and notes and returns eight organism captions.
The repaired public browser suite passed 14 tests; three signed-in cases were skipped.
Anonymous security checks passed again after the repair.
Private bench readback, fresh signed-in generation, and persisted voting on this corrected deployment remain pending.
Browser automation timed out while attaching and attempting login; no signed-in success is inferred from public checks.
Keep Vercel deployment protection off.
