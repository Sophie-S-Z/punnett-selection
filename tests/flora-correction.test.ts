import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";
import {PGlite} from "@electric-sql/pglite";

test("content correction preserves backups and votes while replacing active off-theme cultures",async()=>{
 const db=new PGlite();
 try {
 const catalog=JSON.parse(await readFile(new URL("../docs/flora-fauna-content.json",import.meta.url),"utf8"));
 const seeds=JSON.parse(await readFile(new URL("../docs/flora-fauna-generated.json",import.meta.url),"utf8"));
 const owner="00110000-0000-4000-8000-000000000001";
 await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid; $$; create table public.lab_specimens(id bigint primary key,code text,label text,notes text);`);
 await db.exec(await readFile(new URL("../docs/w4-rating.sql",import.meta.url),"utf8"));
 await db.exec(await readFile(new URL("../docs/personal-bench.sql",import.meta.url),"utf8"));
 await db.query("insert into auth.users values($1)",[owner]);
 for(const row of catalog.publicRows) await db.query("insert into public.lab_specimens values($1,$2,$3,$4)",[row.id,row.code,row.existingLabel,"Original notes"]);
 await db.query("insert into public.punnett_bench_specimens(id,owner_id,label,notes) values(gen_random_uuid(),$1,'Testing','testing...')",[owner]);
 for(const seed of seeds) {
 await db.query("insert into public.punnett_images(id,owner_id,data_url,mime_type) values($1,$2,'data:image/png;base64,aQ==','image/png')",[seed.oldImage,owner]);
 const generation=await db.query<{id:string}>("insert into public.punnett_generations(image_id,owner_id,prompt,model,status) values($1,$2,'Old test prompt','gemini-test','completed') returning id",[seed.oldImage,owner]);
 const caption=await db.query<{id:string}>("insert into public.punnett_captions(generation_id,image_id,content) values($1,$2,'Website caption test') returning id",[generation.rows[0].id,seed.oldImage]);
 await db.query("insert into public.punnett_caption_votes(owner_id,caption_id,vote) values($1,$2,1)",[owner,caption.rows[0].id]);
 }
 const migration=await readFile(new URL("../docs/flora-fauna-correction.sql",import.meta.url),"utf8");
 assert.doesNotMatch(migration,/\b(?:create|alter|drop)\s+policy\b/i);
 await db.exec(migration);
 const page=await db.query<{result:{captions:Array<{text:string}>}}>("select public.punnett_caption_page(0) result");
 assert.equal(page.rows[0].result.captions.length,8);
 assert.ok(page.rows[0].result.captions.every(row=>/\([^)]+\) — /.test(row.text)&&!/website/i.test(row.text)));
 assert.equal((await db.query<{n:number}>("select count(*)::int n from public.punnett_caption_votes")).rows[0].n,2);
 assert.equal((await db.query<{n:number}>("select count(*)::int n from public.punnett_content_backups")).rows[0].n,14);
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);
 assert.deepEqual((await db.query<{result:unknown}>("select public.punnett_vote_history(0) result")).rows[0].result,{votes:[],hasMore:false});
 await db.exec(migration);
 assert.equal((await db.query<{n:number}>("select count(*)::int n from public.punnett_generations where status='completed'")).rows[0].n,2);
 await db.exec("set role anon");
 await assert.rejects(db.query("select * from public.punnett_content_backups"),{code:"42501"});
 } finally {await db.close();}
});
