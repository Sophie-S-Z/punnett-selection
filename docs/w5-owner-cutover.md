# Week 3–5 caption cutover: owner steps

The active product is image upload → funny AI captions → paired voting → image-based history. Species facts, discovery, survival ratings, and organism collections are removed.
The cutover archives the old biology generations and disables their obsolete RPCs. Their text, prompts, and vote records remain for audit. Their embedded image bytes are cleared.
Recent general-humor generations are identified by the exact saved prompt prefix from the new upload flow, not a guess based on caption wording. Their images are retained for transfer to Storage.

## Step 1: database and Storage setup

1. Export `punnett_images` if you want to retain the obsolete species images. The cleanup clears those bytes permanently.
2. Run the updated `docs/w5-caption-storage.sql` in the existing project's SQL editor. Do not rerun old installation or seed scripts.
3. Create a **private** Storage bucket named `caption-images`. Set the maximum file size to **2 MiB** and allowed MIME type to `image/jpeg`.
4. Apply the four conditions in `docs/w5-storage-policy-conditions.md` through Storage → Policies → New policy → For full customization. You authorized a narrow R1 exception for the agent to provide these conditions. Only you apply them.
5. In Supabase, open Storage → Policies and inspect all policies for storage.objects, including older policies. The four caption-images policies should match w5-storage-policy-conditions.md. Older profile-photo policies should explicitly restrict access to profile-photos and the owning user's folder. If another policy allows access to every bucket, uses an unconditional true condition, or grants broad UPDATE/DELETE access to caption-images, send its name and condition for review. Do not delete an older policy merely because its name is unfamiliar.
6. Open SQL Editor → New query, copy docs/w5-rls-check.sql, and run that query alone. It only reads settings. Each row shows table_name and rls_enabled. true means enabled; false means disabled. Send the result table back for review before changing any false flag, so existing access can be checked. This migration changes no RLS settings or policies.
7. This is a progress confirmation to the assistant, not another Supabase button or command. Report that the SQL script, private bucket and four Storage policies are saved, and share the policy review/RLS-check results from substeps 5 and 6. The assistant will then verify the remaining prerequisites and deploy the revised app.

Immediately after Step 1, old generations are temporarily hidden, including recent meme generations whose images await transfer. The `data_url` column remains nullable only for that transfer. Do not run the finish script yet.

## Step 2: transfer recent meme images

NaN The server transfers up to five owned images per visit, registers their Storage paths, clears their old bytes, and restores their captions and existing votes.
New uploads already use Storage directly. A transfer failure keeps its source bytes for recovery. Another user's images are never exposed to the caller.
Confirm the recent meme appears in History → Your creations and its image loads. The current live audit found one recent general-humor image with four captions, alongside 64 old biology captions. These counts are a snapshot, not fixed application data.

## Step 3: remove the binary column

Run `docs/w5-finish-storage.sql` after the transfer. It aborts if any embedded bytes remain, rather than discard a recent image. If it reports an incomplete migration, return to Step 2 and check Storage permissions.
Its final column list must contain `storage_path` and no `data_url`. Files now live in Storage; relational rows contain only paths and text/provenance.

## Production acceptance

Use the immutable deployment URL. Allowlist its exact `/auth/callback` in Supabase. Keep Vercel deployment protection OFF.

- Visitor: root loads, private profile/history/upload routes redirect, voting is locked, and direct private mutations fail.
- New Google user: first login creates a profile and prompts for missing names. Names and optional photo persist after reload.
- Existing user: names/photo can be edited. Logout makes private routes inaccessible.
- Upload a nonpersonal test image with a tone. Real Gemini captions persist. Read back the exact prompt with owner database access.
- Vote: two opposing rows persist, image and captions appear in history after reload, judged captions do not recur.
- Creations: all generated captions persist, including unvoted captions; copy and PNG download work.
- Storage: anonymous reads of pending uploads fail, another user cannot upload/delete in your UUID folder, completed public images load, completed objects cannot be overwritten or deleted through the API.
- Cleanup: old bookmarks redirect; archived species captions do not appear in voting or either history view.

Do not mark production acceptance complete from source inspection or isolated test data.

Official references: [Storage uploads](https://supabase.com/docs/guides/storage/uploads/standard-uploads), [access control](https://supabase.com/docs/guides/storage/security/access-control), [Storage schema](https://supabase.com/docs/guides/storage/schema/design).
