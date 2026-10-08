"use server";

import sharp from "sharp";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { buildGenerationPrompt, geminiRequest, MAX_IMAGE_BYTES, parseGeneratedCaptions, validateUpload, validateSpecimenSource } from "@/lib/punnett/generation";
import { specimenFactCard } from "@/lib/punnett/factCard";
import type { GenerationResult, GenerationStage } from "@/lib/punnett/generation";

export async function generateSpecimens(formData: FormData): Promise<GenerationResult> {
  let stage: GenerationStage = "culturing";
  let generationId: string | null = null;
  let client: Awaited<ReturnType<typeof createClient>> | null = null;
  try {
    client = await createClient();
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) return { ok: false, error: "Put on lab gloves to culture specimens.", stage };
    const file = formData.get("image");
    const specimenId = formData.get("specimenId");
    if (typeof specimenId !== "string" || !/^[1-9]\d*$/.test(specimenId) || !Number.isSafeInteger(Number(specimenId))) return {ok:false,error:"Choose a real specimen from the public lab.",stage};
    const {data: savedSource,error: sourceError} = await client.from("lab_specimens").select("label,notes").eq("id",Number(specimenId)).single();
    const source = savedSource && {label:savedSource.label,notes:savedSource.notes ?? ""};
    if (sourceError || !source || validateSpecimenSource(source)) return {ok:false,error:"This specimen needs a scientific name and natural-history facts before it can be cultured.",stage};
    if (file !== null) {
      if (!(file instanceof File)) return {ok:false,error:"Choose a valid specimen image.",stage};
      const validation = validateUpload(file);
      if (validation) return { ok: false, error: validation, stage };
    }
    const promptInput = formData.get("prompt");
    if (promptInput !== null && typeof promptInput !== "string") return { ok: false, error: "Enter a text direction.", stage };
    if (typeof promptInput === "string" && promptInput.length > 1000) return { ok: false, error: "Keep your direction under 1,000 characters.", stage };
    const prompt = buildGenerationPrompt(promptInput ?? "", source);
    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
    if (!apiKey || !/^gemini-[a-z0-9.-]+$/.test(model)) return { ok: false, error: "The incubator needs its Gemini configuration. Please contact the lab owner.", stage };
    let jpeg: Buffer;
    try {
      if (!(file instanceof File)) {
        jpeg = await sharp(Buffer.from(specimenFactCard(source))).jpeg({quality:80}).toBuffer();
      } else {
      const image = sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 40_000_000, animated: false });
      const metadata = await image.metadata();
      if (!metadata.format || !["jpeg", "png", "webp", "gif"].includes(metadata.format)) {
        return { ok: false, error: "Choose a JPEG, PNG, WebP, or GIF image.", stage };
      }
      jpeg = await image
        .rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 80 }).toBuffer();
      }
    } catch {
      return { ok: false, error: "This image could not be opened. Choose a different JPEG, PNG, WebP, or GIF.", stage };
    }
    if (jpeg.length > MAX_IMAGE_BYTES) return { ok: false, error: "This image is too detailed. Choose a smaller image.", stage };
    const base64 = jpeg.toString("base64");
    const { data: generation, error: createError } = await client.rpc("punnett_create_generation", {
      image_data_url: `data:image/jpeg;base64,${base64}`, prompt_input: prompt, model_input: model,
    });
    if (createError || !generation?.id) {
      return { ok: false, error: createError?.message?.includes("daily_limit") ? "The lab allows 10 cultures in 24 hours. Please try again later." : "The dish could not be saved. Please contact the lab owner if this continues.", stage };
    }
    generationId = generation.id;
    stage = "sequencing";
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(geminiRequest(prompt, base64)), signal: AbortSignal.timeout(45_000), cache: "no-store",
    });
    if (!response.ok) throw new Error("Generation request failed.");
    const captions = parseGeneratedCaptions(await response.json(), source);
    stage = "hatching";
    const { data: completed, error: completeError } = await client.rpc("punnett_complete_generation", {
      generation_id_input: generationId, captions_input: captions,
    });
    if (completeError || !completed?.image_id || !Array.isArray(completed.captions)) throw new Error("Saving captions failed.");
    revalidatePath("/");
    revalidatePath("/incubator");
    return { ok: true, imageId: completed.image_id, captions: completed.captions };
  } catch {
    if (generationId && client) {
      // Cleanup is best-effort. A network failure must still produce a recoverable UI.
      try { await client.rpc("punnett_fail_generation", { generation_id_input: generationId }); } catch { /* No secrets or provider output in logs. */ }
    }
    const error = stage === "sequencing" ? "Sequencing stopped. Try another image or try again shortly. Your image may have been declined by the model." : stage === "hatching" ? "The captions could not be saved. Please try again." : "The incubator is unavailable. Please try again.";
    return { ok: false, error, stage };
  }
}
