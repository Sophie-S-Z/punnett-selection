# Punnett caption generation API

The owner authorized app-owned Supabase tables and Gemini on 2026-10-08 because the course caption API documentation was unavailable. This integration replaces the course API. It does not infer course endpoints.

## Verified provider contract

Official sources checked on 2026-10-08:

- [GenerateContent REST reference](https://ai.google.dev/api/generate-content)
- [Structured output REST guide](https://ai.google.dev/gemini-api/docs/generate-content/structured-output)
- [Gemini 3.5 Flash-Lite model](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite)

The server sends `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`.
The authentication header is `x-goog-api-key`.
The body contains `contents[0].parts`: a text prompt and JPEG bytes in `inlineData: {mimeType: "image/jpeg", data: "<base64>"}`.
`generationConfig.responseFormat.text` sets `mimeType: "APPLICATION_JSON"` and a JSON schema for an array of 2–6 strings, each 1–500 characters.
The REST `TextResponseFormat.mimeType` field is an enum. Use `APPLICATION_JSON`; the SDK-style `application/json` value shown in the structured-output guide fails the real REST request with HTTP 400. This difference was confirmed by a live diagnostic and the REST reference on 2026-10-08.
The app reads `candidates[0].content.parts[].text` and requires `finishReason: "STOP"`.
The app excludes thought parts and rejects malformed, blocked, partial, blank, or repeated results.
Provider error bodies and API keys are never returned to browsers or logged.

The default model is stable `gemini-3.5-flash-lite`.
Its official model page lists image input and structured output support.
`GEMINI_MODEL` can override the model identifier after the owner verifies availability for their API project.
The provider request has a 45-second timeout.
No automatic retry can create unexpected additional model requests.

## Server configuration

Set `GEMINI_API_KEY` through local or Vercel environment settings.
Keep the key server-only. Never prefix it with `NEXT_PUBLIC_`.
Do not commit the key or paste it into chat.
Set `GEMINI_MODEL` only if an alternate supported model is desired.
Use the provider's free quota. Do not enable paid billing for this assignment.
Provider quota availability must be checked by the owner. The app returns a recoverable error if quota is exhausted.

## Application contract and persistence

`generateSpecimens(formData)` is an authenticated Next.js server action.
Form fields: `image` is a File; `prompt` is optional text up to 1,000 characters.
The action verifies the session with `auth.getUser()` before processing an image or contacting Gemini.
Accepted input formats are JPEG, PNG, WebP, and GIF up to 8 MiB.
The browser prepares a JPEG of at most 2 MiB before posting FormData to stay within the production request payload limit. The server independently decodes and validates the received image.
Sharp decodes the image, applies EXIF orientation, resizes to fit within 1,600 × 1,600 pixels, strips metadata, and encodes JPEG.
GIF input uses its first frame.
Decoded images are limited to 40 million pixels. Stored JPEG data is limited to 2 MiB.
The saved image is the same JPEG that Gemini receives.

The primary upload flow requires a real uploaded image and accepts any subject.
The prompt requests four short, original humor/meme captions grounded in visible image details.
Optional tone/context is limited to 1,000 characters and stored in the exact prompt.
The primary parser validates 2–6 nonblank, distinct strings of at most 500 characters without taxon prefixes.
Species discovery and source-specific prompt constraints are removed from the active application.
The provider's 429 response produces a recoverable quota message and marks the pending generation failed.
Results, voting, and history show the saved image beside the caption.
Copy and PNG meme download run in the browser using the existing saved image.

The full exact prompt and model identifier are stored with the generation request before the provider call.

The action calls these app-owned RPCs using the authenticated anon client:

1. `punnett_create_generation_v2(image_path_input, prompt_input, model_input)` saves the image and pending generation. It reserves one of 10 daily requests for the current server session user.
2. `punnett_complete_generation(generation_id_input, captions_input)` atomically stores the validated captions and marks the generation complete.
3. `punnett_fail_generation(generation_id_input)` marks a failed provider or save attempt. Cleanup is best-effort if database connectivity fails.

Successful action result: `{ok: true, imageId, captions: [{id, imageId, text}]}`.
Failed action result: `{ok: false, error, stage}` where stage is `culturing`, `sequencing`, or `hatching`.
These are internal failure stages. The single request does not stream artificial progress to the user.
Source images, full prompts, and generated captions remain in Supabase for subsequent voting.
The UI must explain that submitted images go to Gemini and that successful specimens enter the public selection chamber.

## Deployment prerequisites

The new tables and RPCs must be installed before a live generation can succeed.
The owner must configure and verify RLS separately under AGENTS.md R1.
No service-role credential is used.
Owner configuration and a successful authenticated live generation must be verified before claiming end-to-end completion.

## W5 Storage cutover

Before Gemini is called, the authenticated client uploads the prepared JPEG to the private `caption-images` bucket at `{user.id}/{randomUUID()}.jpg`, with overwrites disabled. The generation RPC verifies the caller-owned path and an existing Storage object. Database rows store `storage_path`, not base64 or binary image contents. Base64 is used transiently only in the provider request.

Completed nonarchived images are exposed through `/media/{id}` after `punnett_read_image` returns a Storage path. Storage policies independently enforce owner upload/read/cleanup and completed-image public reads. The application uses no service-role key. Creation and vote histories are owner-scoped and exclude archived generations. The exact constructed prompt is retained even if the provider fails.

Apply `docs/w5-owner-cutover.md` before deploying the Storage revision. Old biology generations are archived. Recent general-humor images transfer through temporary owner-only RPCs. The finish script refuses to drop the embedded image column until that transfer is complete.
