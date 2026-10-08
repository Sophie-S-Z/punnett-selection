import fs from "node:fs/promises";
import sharp from "sharp";
import { buildGenerationPrompt,geminiRequest,parseGeneratedCaptions } from "../src/lib/punnett/generation.ts";
import { specimenFactCard } from "../src/lib/punnett/factCard.ts";

const proposal = JSON.parse(await fs.readFile("docs/flora-fauna-content.json","utf8"));
const env = process.env;
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY || !env.GEMINI_API_KEY) throw new Error("Configure the ignored local environment first.");
const publicResult = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/punnett_caption_page`,{method:"POST",headers:{apikey:env.NEXT_PUBLIC_SUPABASE_ANON_KEY,"Content-Type":"application/json"},body:JSON.stringify({offset_input:0})});
if (!publicResult.ok) throw new Error("The existing public catalog could not be read.");
const existing = await publicResult.json();
const oldImages = [...new Set<string>(existing.captions.filter((row:{text:string})=>!/^[^\n]+ \([A-Z][^)]+\) — /.test(row.text)).map((row:{imageId:string})=>row.imageId))];
const quote = (value:string) => `'${value.replace(/'/g,"''")}'`;
const model = env.GEMINI_MODEL || "gemini-3.5-flash-lite";
const seeds = await Promise.all([6,7].map(async (id,index)=>{
  const source = proposal.publicRows.find((row:{id:number})=>row.id===id);
  const prompt = buildGenerationPrompt("Make the biological facts absurdly funny, vivid, and dry. Do not add facts.",source);
  const jpeg = await sharp(Buffer.from(specimenFactCard(source))).jpeg({quality:80}).toBuffer();
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":env.GEMINI_API_KEY!},body:JSON.stringify(geminiRequest(prompt,jpeg.toString("base64"))),signal:AbortSignal.timeout(45000)});
  if (!response.ok) throw new Error(`Provider request failed (${response.status}).`);
  return {sourceId:id,label:source.label,prompt,model,captions:parseGeneratedCaptions(await response.json(),source),image:`data:image/jpeg;base64,${jpeg.toString("base64")}`,oldImage:oldImages[index] ?? oldImages[0]};
}));
if (!oldImages.length) throw new Error("No off-theme culture found; inspect before preparing a correction.");
let sql = `-- Flora/fauna content correction. Owner runs in Supabase SQL editor.\n-- Backups preserve all original records and ratings. No policy statements.\n-- Old website cultures are archived; fresh real Gemini cultures receive new ids.\nbegin;\ncreate table if not exists public.punnett_content_backups (content_key text primary key, row_data jsonb not null, saved_at timestamptz not null default now());\nalter table public.punnett_content_backups enable row level security;\nrevoke all on public.punnett_content_backups from public, anon, authenticated;\ninsert into public.punnett_content_backups(content_key,row_data) select 'lab:'||id::text,to_jsonb(s) from public.lab_specimens s on conflict do nothing;\ninsert into public.punnett_content_backups(content_key,row_data) select 'bench:'||id::text,to_jsonb(s) from public.punnett_bench_specimens s on conflict do nothing;\n`;
for (const row of proposal.publicRows) {
 sql += `update public.lab_specimens set label=${quote(row.label)},notes=${quote(row.notes)} where id=${row.id} and code=${quote(row.code)};\n`;
 sql += `update public.punnett_bench_specimens set label=${quote(row.label)},notes=${quote(row.notes)},revision=revision+1,updated_at=now() where label in (${quote(row.existingLabel)},${quote(row.label)});\n`;
}
const replacement = proposal.publicRows.find((row:{id:number})=>row.id===3);
sql += `update public.punnett_bench_specimens set label=${quote(replacement.label)},notes=${quote(replacement.notes)},revision=revision+1,updated_at=now() where label='Testing' and btrim(notes)='testing...';\n`;
for (const imageId of oldImages) {
 if (!/^[0-9a-f-]{36}$/i.test(imageId)) throw new Error("Invalid stored image identity.");
 sql += `insert into public.punnett_content_backups(content_key,row_data) select 'generation:'||id::text,to_jsonb(g) from public.punnett_generations g where image_id=${quote(imageId)}::uuid on conflict do nothing;\nupdate public.punnett_generations set status='failed' where image_id=${quote(imageId)}::uuid;\n`;
}
for (const seed of seeds) sql += `do $$ declare caller uuid; img uuid; gen uuid; item text; begin\nif exists(select 1 from public.punnett_generations where prompt=${quote(seed.prompt)} and status='completed') then return; end if;\nselect owner_id into caller from public.punnett_generations where image_id=${quote(seed.oldImage)}::uuid;\nif caller is null then raise exception 'Original culture owner missing; no seed inserted.'; end if;\ninsert into public.punnett_images(owner_id,data_url,mime_type) values(caller,${quote(seed.image)},'image/jpeg') returning id into img;\ninsert into public.punnett_generations(image_id,owner_id,prompt,model,status,completed_at) values(img,caller,${quote(seed.prompt)},${quote(seed.model)},'completed',now()) returning id into gen;\nfor item in select jsonb_array_elements_text(${quote(JSON.stringify(seed.captions))}::jsonb) loop\ninsert into public.punnett_captions(generation_id,image_id,content) values(gen,img,item);\nend loop; end $$;\n`;
const schema = await fs.readFile("docs/w4-rating.sql","utf8");
const history = schema.slice(schema.indexOf("create function public.punnett_vote_history("),schema.indexOf("create function public.punnett_select_vote("));
sql += history.replace("create function","create or replace function").replace("where v.owner_id = caller order", "join public.punnett_generations g on g.id = c.generation_id and g.status = 'completed'\n    where v.owner_id = caller order").replace("select exists(select 1 from public.punnett_caption_votes where owner_id = caller\n    order by created_at desc, id desc", "select exists(select 1 from public.punnett_caption_votes v join public.punnett_captions c on c.id=v.caption_id join public.punnett_generations g on g.id=c.generation_id and g.status='completed' where v.owner_id = caller\n    order by v.created_at desc, v.id desc");
sql += "notify pgrst, 'reload schema';\ncommit;\nselect count(*) as public_specimens from public.lab_specimens;\nselect count(*) as active_cultures from public.punnett_generations where status='completed';\nselect public.punnett_caption_page(0);\n";
await fs.writeFile("docs/flora-fauna-correction.sql",sql);
await fs.writeFile("docs/flora-fauna-generated.json",JSON.stringify(seeds.map(({image, ...seed})=>({...seed,imageBytes:Buffer.byteLength(image)})),null,2));
console.log(JSON.stringify({publicRows:proposal.publicRows.length,archivedImages:oldImages.length,newCaptions:seeds.reduce((n,s)=>n+s.captions.length,0),output:"docs/flora-fauna-correction.sql"}));
