import assert from "node:assert/strict";
import test from "node:test";
import { selectPair, type CaptionCandidate } from "../src/lib/punnett/pairing.ts";

const candidate = (id: string, imageId = "image-1", text = `Caption ${id}`): CaptionCandidate => ({ id, imageId, text });
const unvoted = new Set<string>();

test("empty, already judged, and single-caption dishes have no pair", () => {
  assert.equal(selectPair([], unvoted), null);
  assert.equal(selectPair([candidate("a")], unvoted), null);
  assert.equal(selectPair([candidate("a"), candidate("b")], new Set(["a", "b"])), null);
  assert.equal(selectPair([candidate("a"), candidate("b")], new Set(["a"])), null);
});

test("a pair always contains distinct unjudged captions from one image", () => {
  const result = selectPair([candidate("a"), candidate("b"), candidate("c"), candidate("d", "image-2")], new Set(["c"]), () => 0);
  assert.ok(result);
  assert.equal(result.imageId, "image-1");
  assert.equal(result.left.imageId, result.right.imageId);
  assert.notEqual(result.left.id, result.right.id);
  assert.deepEqual(new Set([result.left.id, result.right.id]), new Set(["a", "b"]));
});

test("invalid empty candidate fields are excluded", () => {
  const invalid = [candidate(""), candidate(" \t"), candidate("a", ""), candidate("b", " \n"), candidate("c", "image-1", ""), candidate("d", "image-1", " \t")];
  assert.equal(selectPair(invalid, unvoted), null);
  const result = selectPair([...invalid, candidate("x"), candidate("y")], unvoted, () => 0);
  assert.ok(result);
  assert.deepEqual(new Set([result.left.id, result.right.id]), new Set(["x", "y"]));
});

test("duplicate ids cannot form a pair or appear in two image groups", () => {
  assert.equal(selectPair([candidate("a"), candidate("a")], unvoted), null);
  const result = selectPair([candidate("a"), candidate("a", "image-2"), candidate("b", "image-2")], unvoted, () => 0);
  assert.equal(result, null);
  const deduped = selectPair([candidate("a"), candidate("a"), candidate("b")], unvoted, () => 0);
  assert.ok(deduped);
  assert.notEqual(deduped.left.id, deduped.right.id);
});

test("random boundaries select eligible images and distinct captions", () => {
  const rows = [candidate("a"), candidate("b"), candidate("c", "image-2"), candidate("d", "image-2"), candidate("e", "image-2")];
  const first = selectPair(rows, unvoted, () => 0);
  const last = selectPair(rows, unvoted, () => 1 - Number.EPSILON);
  assert.ok(first && last);
  assert.equal(first.imageId, "image-1");
  assert.equal(last.imageId, "image-2");
  assert.notEqual(last.left.id, last.right.id);
});

test("invalid random samples are rejected for image and caption selection", () => {
  const rows = [candidate("a"), candidate("b")];
  for (const invalid of [-1, 1, Infinity, -Infinity, NaN]) {
    assert.throws(() => selectPair(rows, unvoted, () => invalid), RangeError);
    let calls = 0;
    assert.throws(() => selectPair(rows, unvoted, () => ++calls === 1 ? 0 : invalid), RangeError);
  }
});

test("selection leaves candidate arrays, candidate objects, and votes unchanged", () => {
  const rows = Object.freeze([Object.freeze(candidate("a")), Object.freeze(candidate("b")), Object.freeze(candidate("c"))]);
  const votes = new Set(["c"]);
  const before = JSON.stringify(rows);
  assert.ok(selectPair(rows, votes, () => 0.5));
  assert.equal(JSON.stringify(rows), before);
  assert.deepEqual([...votes], ["c"]);
});
