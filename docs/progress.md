# Milestone

W1 / Assignment 1: implementation complete; deployment pending.

# What changed

Created and cloned the private `Sophie-S-Z/punnett-selection` repository.
Created a Next.js 16.3.6 App Router application.
Added the Punnett landing page, shared LabHeader, design tokens, and required fonts.
Pinned exact dependency versions.
Added environment examples and setup guides.
Removed unused starter artwork.

# How I verified it

Production build, ESLint, and TypeScript checks passed after final cleanup.
All three required checks passed before push.
The dependency audit reported zero vulnerabilities.
Browser verification is blocked by browser navigation timeouts.
Vercel deployment is blocked by an invalid CLI token and an unavailable connector deploy operation.

# VERIFY findings (schema, API)

No Supabase project is configured.
No schema or caption API shapes have been assumed.

# HUMAN tasks needed

Restore CLI access with `vercel login`.
Disable deployment protection after project creation, as required by R4.
Follow `docs/supabase-setup.md` to prepare Assignment 2.
Submit the verified deployment URLs personally.

# Open questions

Whether the instructor supplies a staging project or expects a personal project for W2.
