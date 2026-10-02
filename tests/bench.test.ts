import test from "node:test";
import assert from "node:assert/strict";
import { parseBench, parseBenchSpecimen, validateBench } from "../src/lib/punnett/bench.ts";

test("bench rejects malformed database responses rather than exposing controls", () => {
  for (const response of [null, [], {}, { specimens: null }, { specimens: [{ id: "not-a-uuid" }] }]) {
    assert.throws(() => parseBench(response));
  }
  assert.deepEqual(parseBench({ specimens: [] }), []);
});

test("bench validates names, Unicode length, controls and notes", () => {
  assert.ok(validateBench("   ", ""));
  assert.ok(validateBench("name\nextra", ""));
  assert.ok(validateBench("name", "bad\u0000notes"));
  assert.ok(validateBench("name", "a".repeat(4001)));
  assert.equal(validateBench("🧬".repeat(200), "notes\nsecond line"), null);
  assert.ok(validateBench("🧬".repeat(201), ""));
});

test("bench rejects invalid revisions and dates used for edit conflict detection", () => {
  const valid = { id: "954a0308-1972-40ba-8e22-8299c57777fd", label: "Observation", notes: "", revision: 1,
    created_at: "2026-10-01T12:00:00Z", updated_at: "2026-10-01T12:00:00Z" };
  assert.deepEqual(parseBenchSpecimen(valid), valid);
  for (const revision of [0, -1, 1.5, "1"]) assert.throws(() => parseBenchSpecimen({ ...valid, revision }));
  assert.throws(() => parseBenchSpecimen({ ...valid, updated_at: "unknown" }));
});
