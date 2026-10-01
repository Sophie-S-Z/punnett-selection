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
