import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test, { before, beforeEach, after } from "node:test";
import { PGlite } from "@electric-sql/pglite";

const OWNER = "00110000-0000-4000-8000-000000000001";
const OTHER = "00110000-0000-4000-8000-000000000002";
const IMAGE = "data:image/png;base64,aQ==";
let db: PGlite;

before(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$;
  `);
  // Execute the exact owner migration, including grants, RLS, and its transaction.
  await db.exec(await readFile(new URL("../docs/w4-rating.sql", import.meta.url), "utf8"));
});

beforeEach(async () => {
  await db.exec("reset role; truncate auth.users cascade;");
  await db.query("insert into auth.users(id) values ($1), ($2)", [OWNER, OTHER]);
  await session("postgres");
});
after(async () => { await db?.close(); });

async function session(role: "postgres" | "anon" | "authenticated", owner = "") {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [owner]);
  if (role !== "postgres") await db.exec(`set role ${role}`);
}

async function createGeneration() {
  const result = await db.query<{ result: { id: string; image_id: string } }>(
    "select public.punnett_create_generation($1, $2, $3) as result", [IMAGE, "In-memory test prompt", "gemini-test"]);
  return result.rows[0].result;
}

async function completeGeneration(id: string, captions = ["In-memory caption A", "In-memory caption B", "In-memory caption C"]) {
  const result = await db.query<{ result: { id: string; image_id: string; captions: { id: string; imageId: string; text: string }[] } }>(
    "select public.punnett_complete_generation($1, $2::jsonb) as result", [id, JSON.stringify(captions)]);
  return result.rows[0].result;
}

async function catalog(offset = 0) {
  const result = await db.query<{ result: { captions: { id: string; imageId: string; text: string }[]; hasMore: boolean } }>(
    "select public.punnett_caption_page($1) as result", [offset]);
  return result.rows[0].result;
}

async function countVotes() {
  await session("postgres");
  const result = await db.query<{ count: number }>("select count(*)::int as count from public.punnett_caption_votes");
  return result.rows[0].count;
}

test("exact migration enables RLS and denies direct table/private-function access", async () => {
  const flags = await db.query<{ relrowsecurity: boolean }>("select relrowsecurity from pg_class where relname in ('punnett_images', 'punnett_generations', 'punnett_captions', 'punnett_caption_votes')");
  assert.equal(flags.rows.length, 4);
  assert.ok(flags.rows.every(row => row.relrowsecurity));
  for (const role of ["anon", "authenticated"] as const) {
    await session(role, role === "authenticated" ? OWNER : "");
    for (const table of ["punnett_images", "punnett_generations", "punnett_captions", "punnett_caption_votes"]) {
      await assert.rejects(db.query(`select * from public.${table}`), { code: "42501" });
      await assert.rejects(db.query(`insert into public.${table} default values`), { code: "42501" });
      await assert.rejects(db.query(`delete from public.${table}`), { code: "42501" });
    }
  }
  await session("anon");
  assert.deepEqual(await catalog(), { captions: [], hasMore: false });
  await assert.rejects(createGeneration(), { code: "42501" });
  await assert.rejects(db.query("select public.punnett_voted_ids(0)"), { code: "42501" });
  await assert.rejects(db.query("select public.punnett_vote_history(0)"), { code: "42501" });
  await assert.rejects(db.query("select public.punnett_select_vote($1, $2)", [OWNER, OTHER]), { code: "42501" });
  await session("authenticated");
  await assert.rejects(createGeneration(), { code: "42501" });
});

test("generation ownership is derived from session and pending images stay private", async () => {
  await session("authenticated", OWNER);
  const generation = await createGeneration();
  await session("postgres");
  const saved = await db.query<{ owner_id: string; prompt: string; status: string }>(
    "select owner_id, prompt, status from public.punnett_generations where id=$1", [generation.id]);
  assert.deepEqual(saved.rows[0], { owner_id: OWNER, prompt: "In-memory test prompt", status: "pending" });
  await session("anon");
  assert.deepEqual(await catalog(), { captions: [], hasMore: false });
  assert.equal((await db.query<{ image: string | null }>("select public.punnett_read_image($1) as image", [generation.image_id])).rows[0].image, null);
  await session("authenticated", OTHER);
  await assert.rejects(completeGeneration(generation.id), { code: "22023" });
  await db.query("select public.punnett_fail_generation($1)", [generation.id]);
  await session("authenticated", OWNER);
  const completed = await completeGeneration(generation.id);
  assert.equal(completed.captions.length, 3);
  await session("anon");
  assert.equal((await db.query<{ image: string }>("select public.punnett_read_image($1) as image", [generation.image_id])).rows[0].image, IMAGE);
  const page = await catalog();
  assert.equal(page.captions.length, 3);
  assert.deepEqual(Object.keys(page.captions[0]).sort(), ["id", "imageId", "text"]);
  await session("authenticated", OWNER);
  await assert.rejects(completeGeneration(generation.id), { code: "22023" });
});

test("malformed completion rolls back every caption and permits a valid retry", async () => {
  await session("authenticated", OWNER);
  const generation = await createGeneration();
  for (const captions of [["Valid first", ""], ["Same", "Same"], ["Only one"], ["First", 42], { text: "Not an array" }]) {
    await assert.rejects(db.query("select public.punnett_complete_generation($1, $2::jsonb)", [generation.id, JSON.stringify(captions)]), { code: "22023" });
    assert.equal((await catalog()).captions.length, 0);
  }
  const completed = await completeGeneration(generation.id);
  assert.equal(completed.captions.length, 3);
});

test("selection writes two opposing owner votes and duplicate errors roll back both", async () => {
  await session("authenticated", OWNER);
  const completed = await completeGeneration((await createGeneration()).id);
  const second = await completeGeneration((await createGeneration()).id);
  const [a, b, c] = completed.captions;
  await session("authenticated", OTHER);
  await assert.rejects(db.query("select public.punnett_select_vote($1, $2)", [a.id, a.id]), { code: "22023" });
  await assert.rejects(db.query("select public.punnett_select_vote($1, $2)", [a.id, second.captions[0].id]), { code: "22023" });
  assert.equal(await countVotes(), 0);
  await session("authenticated", OTHER);
  await db.query("select public.punnett_select_vote($1, $2)", [a.id, b.id]);
  assert.equal(await countVotes(), 2);
  const rows = await db.query<{ owner_id: string; caption_id: string; vote: number }>("select owner_id, caption_id, vote from public.punnett_caption_votes order by vote desc");
  assert.deepEqual(rows.rows, [{ owner_id: OTHER, caption_id: a.id, vote: 1 }, { owner_id: OTHER, caption_id: b.id, vote: -1 }]);
  await session("authenticated", OTHER);
  // The first row would be new, but the second row is a duplicate: neither survives.
  await assert.rejects(db.query("select public.punnett_select_vote($1, $2)", [c.id, b.id]), { code: "23505" });
  assert.equal(await countVotes(), 2);
  await session("authenticated", OTHER);
  const ids = await db.query<{ result: { ids: string[] } }>("select public.punnett_voted_ids(0) as result");
  assert.deepEqual(new Set(ids.rows[0].result.ids), new Set([a.id, b.id]));
  const history = await db.query<{ result: { votes: { vote: number; captionId: string }[] } }>("select public.punnett_vote_history(0) as result");
  assert.equal(history.rows[0].result.votes.length, 2);
  assert.deepEqual(new Set(history.rows[0].result.votes.map(row => row.vote)), new Set([-1, 1]));
  await session("authenticated", OWNER);
  assert.deepEqual((await db.query<{ result: { votes: unknown[]; hasMore: boolean } }>("select public.punnett_vote_history(0) as result")).rows[0].result, { votes: [], hasMore: false });
});

test("quota counts all attempt states and expires after rolling 24 hours", async () => {
  await session("authenticated", OWNER);
  for (let i = 0; i < 10; i++) {
    const generation = await createGeneration();
    if (i % 3 === 0) await completeGeneration(generation.id);
    else if (i % 2 === 0) await db.query("select public.punnett_fail_generation($1)", [generation.id]);
  }
  await assert.rejects(createGeneration(), error => (error as { code: string; message: string }).code === "22023" && (error as Error).message.includes("daily_limit"));
  await session("authenticated", OTHER);
  assert.ok((await createGeneration()).id);
  await session("postgres");
  await db.query("update public.punnett_generations set created_at=now()-interval '25 hours' where owner_id=$1", [OWNER]);
  await session("authenticated", OWNER);
  assert.ok((await createGeneration()).id);
});

test("catalog, judged ids, and history paginate 500 rows with stable final pages", async () => {
  // In-memory SQL fixtures exercise PostgreSQL pagination without production writes.
  const image = await db.query<{ id: string }>("insert into public.punnett_images(owner_id,data_url,mime_type) values($1,$2,'image/png') returning id", [OWNER, IMAGE]);
  const generation = await db.query<{ id: string }>("insert into public.punnett_generations(image_id,owner_id,prompt,model,status) values($1,$2,'Fixture prompt','gemini-test','completed') returning id", [image.rows[0].id, OWNER]);
  await db.query("insert into public.punnett_captions(generation_id,image_id,content,created_at) select $1,$2,'In-memory pagination caption '||n,now()+n*interval '1 second' from generate_series(1,1001) n", [generation.rows[0].id, image.rows[0].id]);
  await db.query("insert into public.punnett_caption_votes(owner_id,caption_id,vote,created_at) select $1,id,1,created_at from public.punnett_captions", [OWNER]);
  await session("anon");
  const first = await catalog(0);
  const middle = await catalog(500);
  const last = await catalog(1000);
  assert.equal(first.captions.length, 500); assert.equal(first.hasMore, true);
  assert.equal(middle.captions.length, 500); assert.equal(middle.hasMore, true);
  assert.equal(last.captions.length, 1); assert.equal(last.hasMore, false);
  assert.equal(new Set([...first.captions, ...middle.captions, ...last.captions].map(row => row.id)).size, 1001);
  assert.equal(first.captions[0].text, "In-memory pagination caption 1");
  assert.deepEqual(await catalog(1500), { captions: [], hasMore: false });
  await assert.rejects(catalog(-1), { code: "22023" });
  await session("authenticated", OWNER);
  for (const [offset, expected, more] of [[0, 500, true], [500, 500, true], [1000, 1, false]] as const) {
    const ids = (await db.query<{ result: { ids: string[]; hasMore: boolean } }>("select public.punnett_voted_ids($1) as result", [offset])).rows[0].result;
    const votes = (await db.query<{ result: { votes: { text: string }[]; hasMore: boolean } }>("select public.punnett_vote_history($1) as result", [offset])).rows[0].result;
    assert.equal(ids.ids.length, expected); assert.equal(ids.hasMore, more);
    assert.equal(votes.votes.length, expected); assert.equal(votes.hasMore, more);
    if (offset === 0) assert.equal(votes.votes[0].text, "In-memory pagination caption 1001");
  }
  await session("authenticated", OTHER);
  assert.deepEqual((await db.query<{ result: { ids: string[]; hasMore: boolean } }>("select public.punnett_voted_ids(0) as result")).rows[0].result, { ids: [], hasMore: false });
});
