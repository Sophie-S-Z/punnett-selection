import assert from "node:assert/strict";
import test from "node:test";
import { parseCaptionPage, parseVotedPage, parseVotePage, validCaptionId, voteError } from "../src/lib/punnett/rating.ts";

const id = "954a0308-1972-40ba-8e22-8299c57777fd";
const imageId = "954a0308-1972-40ba-8e22-8299c57777fe";
test("caption pages reject malformed server responses", () => {
  const row = { id, imageId, text: "A real caption" };
  assert.deepEqual(parseCaptionPage({ captions: [row], hasMore: false }), { rows: [row], hasMore: false });
  for (const value of [null, [], {}, { captions: [], hasMore: true }, { captions: [{ ...row, text: " " }], hasMore: false }, { captions: [row], hasMore: "false" }]) assert.throws(() => parseCaptionPage(value));
});
test("voted-id pages validate identities and pagination", () => {
  assert.deepEqual(parseVotedPage({ ids: [id], hasMore: false }), { rows: [id], hasMore: false });
  assert.throws(() => parseVotedPage({ ids: ["other"], hasMore: false }));
  assert.throws(() => parseVotedPage({ ids: [], hasMore: true }));
});
test("vote history requires actual captions, vote values, and timestamps", () => {
  const vote = { id, captionId: id, imageId, text: "A real caption", vote: 1, createdAt: "2026-10-08T12:00:00Z" };
  assert.deepEqual(parseVotePage({ votes: [vote], hasMore: false }).rows, [vote]);
  for (const update of [{ vote: 0 }, { createdAt: "yesterday" }, { captionId: "forged" }]) assert.throws(() => parseVotePage({ votes: [{ ...vote, ...update }], hasMore: false }));
});
test("caption identities cannot be arbitrary RPC input", () => {
  assert.equal(validCaptionId(id), true);
  for (const value of ["", "a", "../image", `${id} `]) assert.equal(validCaptionId(value), false);
});
test("vote failures distinguish duplicates without exposing database details", () => {
  assert.deepEqual(voteError({ code: "23505" }), { ok: false, duplicate: true, error: "This pair has already been judged. Loading another pair." });
  assert.deepEqual(voteError({ code: "42501" }), { ok: false, error: "Put on lab gloves before selecting a specimen." });
  assert.equal(voteError({ message: "secret internals" }).error?.includes("secret"), false);
});
