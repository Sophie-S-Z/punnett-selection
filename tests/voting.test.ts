import assert from "node:assert/strict";
import test from "node:test";
import { castVote } from "../src/lib/punnett/voting.ts";

const winner = "954a0308-1972-40ba-8e22-8299c57777fd";
const loser = "954a0308-1972-40ba-8e22-8299c57777fe";
test("anonymous voting stops before any database mutation", async () => {
  let writes = 0;
  const result = await castVote(winner, loser, { authenticate: async () => false, insertPair: async () => { writes++; return {}; } });
  assert.equal(result.ok, false);
  assert.equal(writes, 0);
});
test("a selection uses one atomic database call with only the caption identities", async () => {
  const calls: unknown[] = [];
  const result = await castVote(winner, loser, { authenticate: async () => true, insertPair: async (...ids) => { calls.push(ids); return {}; } });
  assert.deepEqual(result, { ok: true });
  assert.deepEqual(calls, [[winner, loser]]);
});
test("invalid and duplicate caption identities are never written", async () => {
  for (const ids of [[winner, winner], ["forged", loser], [winner, ""]]) {
    const result = await castVote(ids[0], ids[1], { authenticate: async () => true, insertPair: async () => { throw new Error("Must not write"); } });
    assert.equal(result.ok, false);
    assert.match(result.error!, /distinct specimens/);
  }
});
test("duplicate and transport failures return recoverable safe results", async () => {
  const duplicate = await castVote(winner, loser, { authenticate: async () => true, insertPair: async () => ({ error: { code: "23505" } }) });
  assert.equal(duplicate.duplicate, true);
  const failure = await castVote(winner, loser, { authenticate: async () => { throw new Error("secret response"); }, insertPair: async () => ({}) });
  assert.equal(failure.ok, false);
  assert.equal(failure.error?.includes("secret"), false);
});
