import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import sharp from "sharp";
import { PGlite } from "@electric-sql/pglite";
import { ecosystemSeedSql, type EcosystemSeed } from "../scripts/prepare-ecosystem-seed.ts";
import { buildGenerationPrompt, parseGeneratedCaptions } from "../src/lib/punnett/generation.ts";

test("real Gemini organism seed provenance matches source-bound prompts and valid JPEG fact cards", async () => {
  const seeds: EcosystemSeed[] = JSON.parse(await readFile(new URL("../docs/ecosystem-seeds.json",import.meta.url),"utf8"));
  assert.equal(seeds.length,9);
  assert.equal(new Set(seeds.map(seed=>seed.label)).size,9);
  for(const seed of seeds) {
    assert.equal(seed.prompt,buildGenerationPrompt(seed.direction ?? "Wildly funny, vivid dry natural-history field notes. Four different original punchlines; no new biological claims.",seed));
    assert.equal(seed.captions.length,4);
    assert.deepEqual(parseGeneratedCaptions({candidates:[{finishReason:"STOP",content:{parts:[{text:JSON.stringify(seed.captions)}]}}]},seed),seed.captions);
    const image=await sharp(Buffer.from(seed.image.split(",")[1],"base64")).metadata();
    assert.equal(image.format,"jpeg"); assert.equal(image.width,800); assert.equal(image.height,600);
  }
  const sql=await readFile(new URL("../docs/ecosystem-seed.sql",import.meta.url),"utf8");
  assert.equal(sql,ecosystemSeedSql(seeds));
  assert.doesNotMatch(sql,/\b(?:create|alter|drop)\s+policy\b/i);
  assert.throws(()=>ecosystemSeedSql([{...seeds[0],sourceId:NaN}]));
});

test("owner seed publishes eleven organisms with 44 captions, preserves votes and is idempotent",async()=>{
  const db=new PGlite();
  const seeds:EcosystemSeed[]=JSON.parse(await readFile(new URL("../docs/ecosystem-seeds.json",import.meta.url),"utf8"));
  const owner="00110000-0000-4000-8000-000000000001";
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid; $$; create table public.lab_specimens(id bigint primary key,label text,notes text);`);
    await db.exec(await readFile(new URL("../docs/w4-rating.sql",import.meta.url),"utf8"));
    await db.exec(await readFile(new URL("../docs/ecosystem-rating.sql",import.meta.url),"utf8"));
    await db.query("insert into auth.users values($1)",[owner]);
    for(const seed of seeds) await db.query("insert into public.lab_specimens values($1,$2,$3)",[seed.sourceId,seed.label,seed.notes]);
    let preservedCaption="";
    for(const [index,label] of ["Dead man's fingers (Xylaria polymorpha)","Sea cucumbers (Holothuroidea)"].entries()) {
      const imageId=index===0?"c6da54f1-df9e-48e4-9e40-c1e2e954975b":"44bbda39-860a-4631-b51d-b33718d3ebd5";
      await db.query("insert into public.punnett_images(id,owner_id,data_url,mime_type) values($1,$2,'data:image/jpeg;base64,aQ==','image/jpeg')",[imageId,owner]);
      const generation=(await db.query<{id:string}>("insert into public.punnett_generations(image_id,owner_id,prompt,model,status) values($1,$2,$3,'test','completed') returning id",[imageId,owner,`Original ${index}`])).rows[0].id;
      const inserted=await db.query<{id:string}>("insert into public.punnett_captions(generation_id,image_id,content) select $1,$2,$3||' — Fixture caption '||n from generate_series(1,4) n returning id",[generation,imageId,label]);
      if(index===0) preservedCaption=inserted.rows[0].id;
    }
    await db.query("insert into public.punnett_caption_votes(owner_id,caption_id,vote) values($1,$2,1)",[owner,preservedCaption]);
    const sql=await readFile(new URL("../docs/ecosystem-seed.sql",import.meta.url),"utf8");
    await db.exec(sql);
    await db.exec(sql);
    const state=(await db.query<{result:{specimens:Array<{text:string}>}}>("select public.punnett_ecosystem_page(0) result")).rows[0].result;
    assert.equal(state.specimens.length,44);
    assert.equal(new Set(state.specimens.map(row=>row.text.split(" — ")[0])).size,11);
    assert.equal((await db.query<{n:number}>("select count(*)::int n from public.punnett_generations where status='completed'")).rows[0].n,11);
    assert.equal((await db.query<{n:number}>("select count(*)::int n from public.punnett_caption_votes")).rows[0].n,1);
    const stored=(await db.query<{owner_id:string;prompt:string;model:string}>("select owner_id,prompt,model from public.punnett_generations where model<>'test'")).rows;
    assert.ok(stored.every(row=>row.owner_id===owner && seeds.some(seed=>seed.prompt===row.prompt&&seed.model===row.model)));
    assert.equal((await db.query<{n:number}>("select count(*)::int n from public.punnett_generations where is_catalog_seed")).rows[0].n,11);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);
    await db.exec("set role authenticated");
    for(let n=0;n<10;n++) {
      const result=(await db.query<{result:{id:string}}>("select public.punnett_create_generation('data:image/jpeg;base64,aQ==',$1,'test') result",[`User attempt ${n}`])).rows[0].result;
      // Failed and pending user attempts remain counted; editorial seed flags cannot be set through this RPC.
      if(n===0) await db.query("select public.punnett_fail_generation($1)",[result.id]);
    }
    await assert.rejects(db.query("select public.punnett_create_generation('data:image/jpeg;base64,aQ==','Eleventh user attempt','test')"),{code:"22023"});
    await assert.rejects(db.query("update public.punnett_generations set is_catalog_seed=true"),{code:"42501"});
    await db.exec("reset role");
    assert.equal((await db.query<{n:number}>("select count(*)::int n from public.punnett_generations where not is_catalog_seed")).rows[0].n,10);
    assert.equal((await db.query<{n:number}>("select count(*)::int n from public.punnett_generations")).rows[0].n,21);
  } finally {await db.close();}
});
