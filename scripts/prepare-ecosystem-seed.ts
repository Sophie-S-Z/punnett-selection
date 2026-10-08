import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { buildGenerationPrompt, geminiRequest, parseGeneratedCaptions, validateSpecimenSource } from "../src/lib/punnett/generation.ts";
import { specimenFactCard } from "../src/lib/punnett/factCard.ts";

export type EcosystemSeed = { sourceId: number; label: string; notes: string; prompt: string; model: string; captions: string[]; image: string; direction?: string };
const ORIGINAL_IMAGE = "c6da54f1-df9e-48e4-9e40-c1e2e954975b";
const quote = (value: string) => `E'${value.replace(/\\/g,"\\\\").replace(/'/g,"''").replace(/\r/g,"\\r").replace(/\n/g,"\\n")}'`;
const baseSchema = await fs.readFile(new URL("../docs/w4-rating.sql", import.meta.url), "utf8");
const createGeneration = baseSchema.slice(baseSchema.indexOf("create function public.punnett_create_generation("), baseSchema.indexOf("create function public.punnett_complete_generation("));
if (!createGeneration.includes("where owner_id = caller and created_at >= now() - interval '24 hours'")) throw new Error("Generation quota source changed; review before preparing seed.");
const seedQuotaSql = createGeneration.replace("create function", "create or replace function").replace("where owner_id = caller and created_at >= now() - interval '24 hours'", "where owner_id = caller and not is_catalog_seed and created_at >= now() - interval '24 hours'");

export function ecosystemSeedSql(seeds: readonly EcosystemSeed[]): string {
  let sql = "-- Real Gemini variety cultures from saved public organism facts. Owner applies.\n-- Existing captions, votes and source records are preserved. No policy statements.\n-- Owner-only seed flag excludes editorial cultures from user generation quota.\nbegin;\nalter table public.punnett_generations add column if not exists is_catalog_seed boolean not null default false;\n";
  sql += seedQuotaSql;
  sql += "update public.punnett_generations set is_catalog_seed=true where image_id in ('c6da54f1-df9e-48e4-9e40-c1e2e954975b'::uuid,'44bbda39-860a-4631-b51d-b33718d3ebd5'::uuid) and status='completed';\n";
  for (const seed of seeds) {
    if (!Number.isSafeInteger(seed.sourceId) || seed.sourceId < 1 || validateSpecimenSource(seed) || seed.captions.length !== 4 || seed.captions.some(caption => !caption.startsWith(`${seed.label} — `))) throw new Error("Invalid reviewed seed.");
    sql += `do $$ declare caller uuid; img uuid; gen uuid; item text; begin\nif exists(select 1 from public.punnett_generations where prompt=${quote(seed.prompt)} and status='completed') then\nupdate public.punnett_generations set is_catalog_seed=true where prompt=${quote(seed.prompt)} and status='completed'; return; end if;\nselect owner_id into caller from public.punnett_generations where image_id='${ORIGINAL_IMAGE}'::uuid and status='completed';\nif caller is null then raise exception 'Original biological culture owner missing; no seed inserted.'; end if;\nif not exists(select 1 from public.lab_specimens where id=${seed.sourceId} and label=${quote(seed.label)} and notes=${quote(seed.notes)}) then raise exception 'Saved organism facts changed; review seed again.'; end if;\ninsert into public.punnett_images(owner_id,data_url,mime_type) values(caller,${quote(seed.image)},'image/jpeg') returning id into img;\ninsert into public.punnett_generations(image_id,owner_id,prompt,model,status,completed_at,is_catalog_seed) values(img,caller,${quote(seed.prompt)},${quote(seed.model)},'completed',now(),true) returning id into gen;\nfor item in select jsonb_array_elements_text(${quote(JSON.stringify(seed.captions))}::jsonb) loop\ninsert into public.punnett_captions(generation_id,image_id,content) values(gen,img,item);\nend loop; end $$;\n`;
  }
  return sql + "notify pgrst, 'reload schema';\ncommit;\nselect count(*) as active_cultures from public.punnett_generations where status='completed';\nselect public.punnett_ecosystem_page(0);\n";
}

async function main() {
  const env = process.env;
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY || !env.GEMINI_API_KEY) throw new Error("Configure the ignored local environment first.");
  if (process.argv.includes("--repair-reviewed")) {
    const reviewed: EcosystemSeed[] = JSON.parse(await fs.readFile("docs/ecosystem-seeds.json", "utf8"));
    const direction = "Wildly funny dry field notes. Do not call stomach oil toxic. Do not invent pairs, fur, or new biological properties. Clearly figurative punchlines only. Four distinct original jokes using only the saved facts.";
    const updated = await Promise.all(reviewed.map(async seed => {
      if (!seed.label.startsWith("Northern fulmar (") && !seed.label.startsWith("Hairy frog (")) return seed;
      const prompt = buildGenerationPrompt(direction, seed);
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${seed.model}:generateContent`, {
        method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY! },
        body: JSON.stringify(geminiRequest(prompt, seed.image.split(",")[1])), signal: AbortSignal.timeout(45000),
      });
      if (!response.ok) throw new Error(`Provider request failed (${response.status}) for source ${seed.sourceId}.`);
      const captions = parseGeneratedCaptions(await response.json(), seed);
      if (captions.length !== 4) throw new Error("Expected four revised captions.");
      return { ...seed, direction, prompt, captions };
    }));
    await fs.writeFile("docs/ecosystem-seeds.json", JSON.stringify(updated, null, 2));
    await fs.writeFile("docs/ecosystem-seed.sql", ecosystemSeedSql(updated));
    console.log(JSON.stringify({ regeneratedOrganisms: 2, captions: 8, output: "docs/ecosystem-seed.sql" }));
    return;
  }
  const headers = { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY, "Content-Type": "application/json" };
  const [catalogResponse, captionsResponse] = await Promise.all([
    fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/lab_specimens?select=id,label,notes&order=id`, { headers }),
    fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/punnett_caption_page`, { method: "POST", headers, body: JSON.stringify({ offset_input: 0 }) }),
  ]);
  if (!catalogResponse.ok || !captionsResponse.ok) throw new Error("Public organisms or completed cultures could not be read.");
  const catalog: Array<{ id: number; label: string; notes: string }> = await catalogResponse.json();
  const page: { captions: Array<{ text: string }>; hasMore: boolean } = await captionsResponse.json();
  if (!catalog.length || page.hasMore) throw new Error("Inspect empty catalog or multi-page cultures before preparing a seed.");
  const activeLabels = new Set(page.captions.map(row => row.text.split(" — ")[0]));
  const sources = catalog.filter(source => !activeLabels.has(source.label));
  const seeds: EcosystemSeed[] = [];
  const model = env.GEMINI_MODEL || "gemini-3.5-flash-lite";
  for (let offset = 0; offset < sources.length; offset += 2) {
    const batch = await Promise.allSettled(sources.slice(offset, offset + 2).map(async source => {
      const prompt = buildGenerationPrompt("Wildly funny, vivid dry natural-history field notes. Four different original punchlines; no new biological claims.", source);
      const jpeg = await sharp(Buffer.from(specimenFactCard(source))).jpeg({ quality: 80 }).toBuffer();
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY! },
        body: JSON.stringify(geminiRequest(prompt, jpeg.toString("base64"))), signal: AbortSignal.timeout(45000),
      });
      if (!response.ok) throw new Error(`Provider request failed (${response.status}) for source ${source.id}.`);
      const captions = parseGeneratedCaptions(await response.json(), source);
      if (captions.length !== 4) throw new Error(`Source ${source.id} returned ${captions.length} captions; review before seeding.`);
      return { sourceId: source.id, label: source.label, notes: source.notes, prompt, model, captions, image: `data:image/jpeg;base64,${jpeg.toString("base64")}` };
    }));
    for (const result of batch) if (result.status === "fulfilled") seeds.push(result.value);
    await fs.writeFile("docs/ecosystem-seeds.json", JSON.stringify(seeds, null, 2));
    await fs.writeFile("docs/ecosystem-seed.sql", ecosystemSeedSql(seeds));
    const failed = batch.find(result => result.status === "rejected");
    if (failed?.status === "rejected") throw failed.reason;
  }
  console.log(JSON.stringify({ existingOrganisms: activeLabels.size, newOrganisms: seeds.length, newCaptions: seeds.reduce((sum, seed) => sum + seed.captions.length, 0), output: "docs/ecosystem-seed.sql" }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
