import assert from "node:assert/strict";
import test from "node:test";
import { buildGenerationPrompt, parseGeneratedCaptions, validateUpload, geminiRequest } from "../src/lib/punnett/generation.ts";

test("upload validation rejects oversized, empty, and non-image inputs", () => {
  assert.equal(validateUpload({ size: 1, type: "image/jpeg" }), null);
  assert.ok(validateUpload({ size: 0, type: "image/jpeg" }));
  assert.ok(validateUpload({ size: 8 * 1024 * 1024 + 1, type: "image/png" }));
  assert.ok(validateUpload({ size: 1, type: "image/svg+xml" }));
});

test("prompt validates user direction and preserves the exact bounded input", () => {
  assert.match(buildGenerationPrompt(""), /campus/i);
  assert.match(buildGenerationPrompt("  dry subway humor  "), /dry subway humor/);
  assert.throws(() => buildGenerationPrompt("x".repeat(1001)));
});

const response = (text: string, finishReason = "STOP") => ({ candidates: [{ finishReason, content: { parts: [{ text }] } }] });

test("structured captions are bounded, trimmed, distinct, and complete", () => {
  assert.deepEqual(parseGeneratedCaptions(response('[" A ","B"]')), ["A", "B"]);
  for (const invalid of ['["A"]', '["A"," "]', '["A","A"]', '[1,2]', JSON.stringify(["A", "x".repeat(501)]), "not json"]) {
    assert.throws(() => parseGeneratedCaptions(response(invalid)));
  }
  assert.throws(() => parseGeneratedCaptions(response('["A","B"]', "MAX_TOKENS")));
  assert.throws(() => parseGeneratedCaptions({ promptFeedback: { blockReason: "SAFETY" } }));
  assert.throws(() => parseGeneratedCaptions(response(JSON.stringify(Array.from({ length: 7 }, (_, i) => String(i))))));
});

test("Gemini request embeds JPEG data and constrains JSON output", () => {
  const body = geminiRequest("saved prompt", "aGVsbG8=");
  assert.deepEqual(body.contents[0].parts, [{ text: "saved prompt" }, { inlineData: { mimeType: "image/jpeg", data: "aGVsbG8=" } }]);
  assert.equal(body.generationConfig.responseFormat.text.mimeType, "APPLICATION_JSON");
  assert.equal(body.generationConfig.responseFormat.text.schema.minItems, 2);
});
