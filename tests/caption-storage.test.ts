import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
type Caption = { id: string; imageId: string; text: string };
type RpcDocument = { id: string; image_id: string; captions: Caption[]; votes: unknown[]; hasMore: boolean };
const OWNER="00110000-0000-4000-8000-000000000001", OTHER="00110000-0000-4000-8000-000000000002";
const migration=await readFile(new URL("../docs/w5-caption-storage.sql",import.meta.url),"utf8");
test("caption cutover archives legacy data, removes binary columns and preserves secure mutations",async()=>{
 const db=new PGlite();
 try {
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;$$;
 create schema storage;create table storage.objects(bucket_id text,name text);`);
 await db.exec(await readFile(new URL("../docs/w4-rating.sql",import.meta.url),"utf8"));
 await db.query("insert into auth.users values($1),($2)",[OWNER,OTHER]);
 const session=async(role="postgres",owner="")=>{await db.exec("reset role");await db.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);if(role!=="postgres")await db.exec(`set role ${role}`);};
 const rpc=async <T=RpcDocument>(name:string,args:unknown[]=[],types:string[]=[])=>{
 const placeholders=args.map((_,i)=>`$${i+1}${types[i]?'::'+types[i]:''}`).join(',');
 return (await db.query<{result:T}>(`select public.${name}(${placeholders}) as result`,args)).rows[0].result;
 };
 await session("authenticated",OWNER);
 const old=await rpc("punnett_create_generation",["data:image/png;base64,aQ==","Old biology prompt","gemini-test"]);
 const legacy=await rpc("punnett_complete_generation",[old.id,JSON.stringify(["Old species fact A","Old species fact B"])],["uuid","jsonb"]);
 await rpc("punnett_select_vote",legacy.captions.map((c:Caption)=>c.id));
 const recent=await rpc("punnett_create_generation",["data:image/jpeg;base64,aQ==","Write four funny, original meme captions for the uploaded image.\nReal recent context","gemini-test"]);
 await rpc("punnett_complete_generation",[recent.id,JSON.stringify(["Recent real meme A","Recent real meme B"])],["uuid","jsonb"]);
 await session();await db.exec(migration);
 assert.equal((await db.query<{count:number}>("select count(*)::int as count from public.punnett_images where data_url is not null")).rows[0].count,1);
 assert.equal((await db.query<{count:number}>("select count(*)::int as count from public.punnett_caption_votes")).rows[0].count,2);
 await session("anon");assert.deepEqual(await rpc("punnett_caption_page",[0]),{captions:[],hasMore:false});
 assert.equal(await rpc("punnett_read_image",[old.image_id]),null);
 for(const name of ["punnett_create_generation_v2","punnett_creation_history","punnett_vote_history"]) {
 await assert.rejects(rpc(name,name==="punnett_create_generation_v2"?["a","b","c"]:[0]),{code:"42501"});
 }
 await session("authenticated",OWNER);
 assert.deepEqual(await rpc("punnett_vote_history",[0]),{votes:[],hasMore:false});
 await assert.rejects(rpc("punnett_create_generation",["data:image/png;base64,aQ==","old","gemini-test"]),{code:"42501"});
 await assert.rejects(rpc("punnett_select_vote",legacy.captions.map((c:Caption)=>c.id)),{code:"22023"});
 const transferPath=OWNER+"/00110000-0000-4000-8000-000000000088.jpg";
 await session();
 const finish=await readFile(new URL("../docs/w5-finish-storage.sql",import.meta.url),"utf8");
 await assert.rejects(db.exec(finish));await db.exec("rollback");
 await db.query("insert into storage.objects values('caption-images',$1)",[transferPath]);
 await session("authenticated",OTHER);
 assert.deepEqual(await rpc("punnett_legacy_image_page"),[]);
 await assert.rejects(rpc("punnett_migrate_image",[recent.image_id,transferPath]),{code:"22023"});
 await session("authenticated",OWNER);
 const legacyImages=await rpc<{id:string;dataUrl:string}[]>("punnett_legacy_image_page");
 assert.equal(legacyImages.length,1);assert.equal(legacyImages[0].id,recent.image_id);
 assert.equal(await rpc("punnett_migrate_image",[recent.image_id,transferPath]),transferPath);
 await session();await db.exec(finish);
 assert.equal((await db.query("select column_name from information_schema.columns where table_name='punnett_images' and column_name='data_url'")).rows.length,0);
 await session("authenticated",OWNER);assert.deepEqual(await rpc("punnett_legacy_image_page"),[]);
 const path=OWNER+"/00110000-0000-4000-8000-000000000099.jpg";
 await assert.rejects(rpc("punnett_create_generation_v2",[path,"Exact user prompt","gemini-test"]),{code:"22023"});
 await session();await db.query("insert into storage.objects values('caption-images',$1)",[path]);
 await session("authenticated",OTHER);
 await assert.rejects(rpc("punnett_create_generation_v2",[path,"Exact user prompt","gemini-test"]),{code:"22023"});
 await session("authenticated",OWNER);
 const fresh=await rpc("punnett_create_generation_v2",[path,"Exact user prompt","gemini-test"]);
 await session("anon");assert.equal(await rpc("punnett_image_is_public",[path]),false);
 await session("authenticated",OTHER);await assert.rejects(rpc("punnett_complete_generation",[fresh.id,JSON.stringify(["First joke","Second joke"])],["uuid","jsonb"]),{code:"22023"});
 await session("authenticated",OWNER);
 const completed=await rpc("punnett_complete_generation",[fresh.id,JSON.stringify(["First joke","Second joke","Third joke"])],["uuid","jsonb"]);
 await session("anon");assert.equal(await rpc("punnett_read_image",[fresh.image_id]),path);assert.equal(await rpc("punnett_image_is_public",[path]),true);
 assert.equal((await rpc("punnett_caption_page",[0])).captions.length,5);
 await session("authenticated",OTHER);assert.deepEqual(await rpc("punnett_creation_history",[0]),{captions:[],hasMore:false});
 const [a,b,c]=completed.captions;
 await rpc("punnett_select_vote",[a.id,b.id]);
 await assert.rejects(rpc("punnett_select_vote",[c.id,b.id]),{code:"23505"});
 assert.equal((await rpc("punnett_vote_history",[0])).votes.length,2);
 await session("authenticated",OWNER);assert.equal((await rpc("punnett_creation_history",[0])).captions.length,5);
 await session();assert.equal((await db.query<{prompt:string}>("select prompt from public.punnett_generations where id=$1",[fresh.id])).rows[0].prompt,"Exact user prompt");
 // Mixed archived and active records must paginate without leaking archived rows.
 await db.query("insert into public.punnett_captions(generation_id,image_id,content) select $1,$2,'Pagination joke '||n from generate_series(1,501) n",[fresh.id,fresh.image_id]);
 await db.query("insert into public.punnett_caption_votes(owner_id,caption_id,vote) select $1,id,1 from public.punnett_captions where content like 'Pagination joke %'",[OTHER]);
 await session("authenticated",OWNER);
 const first=await rpc("punnett_creation_history",[0]),last=await rpc("punnett_creation_history",[500]);
 assert.equal(first.captions.length,500);assert.equal(first.hasMore,true);assert.equal(last.captions.length,6);assert.equal(last.hasMore,false);
 assert.equal(new Set([...first.captions,...last.captions].map(c=>c.id)).size,506);
 await assert.rejects(rpc("punnett_creation_history",[-1]),{code:"22023"});
 await session("authenticated",OTHER);assert.equal((await rpc("punnett_vote_history",[500])).votes.length,3);
 await session();
 // A second application must preserve post-cutover captions and votes.
 await db.exec(migration);await session("anon");assert.equal((await rpc("punnett_caption_page",[0])).captions.length,500);
 } finally {await db.close();}
});
