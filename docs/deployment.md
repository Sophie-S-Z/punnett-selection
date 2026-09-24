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
| 2 | 8826249 | https://punnett-selection-h7rv9adje-sophie-zhangs-projects.vercel.app | Deployed; live query returns zero rows |

The owner will submit the final URLs in the course portal.
