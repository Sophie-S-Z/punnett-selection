import assert from "node:assert/strict";
import test from "node:test";
import { parseEcosystemPage, selectSurvivor, survivalFitness, ecosystemStats, castSurvivalRating } from "../src/lib/punnett/ecosystem.ts";

const id = "10000000-0000-4000-8000-000000000001";
const imageId = "20000000-0000-4000-8000-000000000001";
const rows = [
  { id, imageId, text: "Sea cucumber (Holothuroidea) — Emergency interior renovation.", up: 3, down: 2 },
  { id: "10000000-0000-4000-8000-000000000002", imageId, text: "Sea cucumber (Holothuroidea) — A different joke.", up: 0, down: 0 },
  { id: "10000000-0000-4000-8000-000000000003", imageId, text: "Dead man's fingers (Xylaria polymorpha) — Timber's farewell wave.", up: 1, down: 0 },
];

test("ecosystem parser validates bounded counts, UUIDs, text and pagination", () => {
  assert.deepEqual(parseEcosystemPage({ specimens: rows, hasMore: false }), { rows, hasMore: false });
  for (const invalid of [null, { specimens: [], hasMore: true }, { specimens: [{ ...rows[0], up: -1 }], hasMore: false }, { specimens: [{ ...rows[0], down: 1.5 }], hasMore: false }, { specimens: [{ ...rows[0], id: "bad" }], hasMore: false }]) assert.throws(() => parseEcosystemPage(invalid));
});

test("survival selection samples organisms before captions and excludes all judged notes", () => {
  assert.equal(selectSurvivor(rows, new Set([id]), undefined, undefined, () => 0)?.id, rows[1].id);
  assert.equal(selectSurvivor(rows, new Set(), "Sea cucumber (Holothuroidea)", undefined, () => 0)?.id, rows[2].id);
  assert.equal(selectSurvivor(rows, new Set(), undefined, id, () => 0)?.id, rows[1].id);
  assert.equal(selectSurvivor(rows, new Set(rows.map(row => row.id))), null);
  assert.throws(() => selectSurvivor(rows, new Set(), undefined, undefined, () => 1));
});

test("fitness requires five selections and stats derive from actual complete caption set", () => {
  assert.equal(survivalFitness(3, 1), null);
  assert.equal(survivalFitness(3, 2), 0.6);
  assert.deepEqual(ecosystemStats(rows, new Set([id])), { specimens: 3, organisms: 2, selections: 6, unjudged: 2 });
});

test("single rating authenticates, validates input, handles duplicates and never accepts owner identity", async () => {
  let inserted = 0;
  const store = { authenticate: async () => true, insert: async (caption: string, vote: 1 | -1) => { assert.equal(caption,id); assert.equal(vote,-1); inserted++; return {error:null}; } };
  assert.deepEqual(await castSurvivalRating(id,-1,store), {ok:true});
  assert.equal(inserted,1);
  assert.equal((await castSurvivalRating(id,0,store)).ok,false);
  assert.equal((await castSurvivalRating("bad",1,store)).ok,false);
  assert.equal((await castSurvivalRating(id,1,{...store,authenticate:async()=>false})).ok,false);
  assert.equal(inserted,1);
  assert.equal((await castSurvivalRating(id,1,{...store,insert:async()=>({error:{code:"23505"}})})).duplicate,true);
});
