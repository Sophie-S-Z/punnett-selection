import assert from "node:assert/strict";
import test from "node:test";
import { MAX_PHOTO_BYTES, needsProfileNames, parseProfile, validateNames, validatePhoto } from "../src/lib/punnett/profile.ts";

test("onboarding requires both names and rejects whitespace-only values", () => {
  for (const names of [{ first_name: null, last_name: "Zhang" }, { first_name: "Sophie", last_name: null }, { first_name: " ", last_name: "Zhang" }]) assert.equal(needsProfileNames(names), true);
  assert.equal(needsProfileNames({ first_name: "Sophie", last_name: "Zhang" }), false);
});
test("names accept Unicode and reject empty, oversized, or control-character input", () => {
  assert.equal(validateNames(" Sophie ", "张"), null);
  assert.equal(validateNames("O’Connor", "Anne-Marie"), null);
  for (const name of [" ", "A".repeat(101), "A\nB"]) assert.ok(validateNames(name, "Zhang"));
});
test("photo boundaries reject empty files, oversize uploads, and active content", () => {
  assert.equal(validatePhoto({ size: MAX_PHOTO_BYTES, type: "image/png" }), null);
  for (const file of [{ size: 0, type: "image/png" }, { size: MAX_PHOTO_BYTES + 1, type: "image/png" }, { size: 20, type: "image/svg+xml" }, { size: 20, type: "text/html" }]) assert.ok(validatePhoto(file));
});
test("invalid profile responses are rejected rather than treated as complete profiles", () => {
  for (const value of [null, [], {}, { id: "id", updated_at: "now", first_name: 1, last_name: null, avatar_path: null }]) assert.throws(() => parseProfile(value));
  const profile = { id: "id", updated_at: "now", first_name: null, last_name: null, avatar_path: null };
  assert.deepEqual(parseProfile(profile), profile);
});
