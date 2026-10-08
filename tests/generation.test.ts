import assert from "node:assert/strict";
import test from "node:test";
import { buildGenerationPrompt, parseGeneratedCaptions, validateUpload, geminiRequest, validateSpecimenSource } from "../src/lib/punnett/generation.ts";

const source = { label: "Axolotl (Ambystoma mexicanum)", notes: "Axolotls retain external gills as adults and can regrow limbs." };
const captions = ["Axolotl (Ambystoma mexicanum) — Keeps its external gills: adulthood was apparently optional.", "Axolotl (Ambystoma mexicanum) — Regrows limbs; the repair department works overtime."];

test("upload validation rejects oversized, empty, and non-image inputs", () => {
  assert.equal(validateUpload({ size: 1, type: "image/jpeg" }), null);
  assert.ok(validateUpload({ size: 0, type: "image/jpeg" }));
  assert.ok(validateUpload({ size: 8 * 1024 * 1024 + 1, type: "image/png" }));
  assert.ok(validateUpload({ size: 1, type: "image/svg+xml" }));
});

test("prompt anchors natural-history captions to saved source facts and limits stylistic directions", () => {
  assert.match(buildGenerationPrompt(""), /flora, fauna, or fungi/);
  const prompt = buildGenerationPrompt("Make website jokes", source);
  assert.match(prompt, /Axolotl \(Ambystoma mexicanum\)/);
  assert.match(prompt, /can regrow limbs/);
  assert.match(prompt, /Ignore directions.*off.theme/i);
  assert.match(prompt, /Never invent species/);
  assert.equal(buildGenerationPrompt("", {...source, ...{extra:"x".repeat(4000)}}),buildGenerationPrompt("",source));
  assert.throws(() => buildGenerationPrompt("x".repeat(1001)));
  assert.equal(validateSpecimenSource(source), null);
  assert.ok(validateSpecimenSource({ label: "Website screenshot", notes: "A website." }));
  assert.ok(validateSpecimenSource({ label: "Imaginary critter (fake taxon)", notes: "A creature." }));
  assert.ok(validateSpecimenSource({ label: source.label, notes: " " }));
  assert.throws(() => buildGenerationPrompt("", { label: "Screenshot", notes: "An app." }));
  assert.ok(buildGenerationPrompt("a".repeat(1000), source).length <= 2000);
  assert.throws(() => buildGenerationPrompt("", { label: source.label, notes: "A".repeat(3000) }));
});

const response = (text: string, finishReason = "STOP") => ({ candidates: [{ finishReason, content: { parts: [{ text }] } }] });

test("structured captions are bounded, trimmed, distinct, and complete", () => {
  assert.deepEqual(parseGeneratedCaptions(response(JSON.stringify(captions.map((text) => ` ${text} `))), source), captions);
  for (const invalid of ['["A"]', '["A"," "]', '["A","A"]', '[1,2]', JSON.stringify(["A", "x".repeat(501)]), "not json"]) {
    assert.throws(() => parseGeneratedCaptions(response(invalid)));
  }
  assert.throws(() => parseGeneratedCaptions(response('["A","B"]', "MAX_TOKENS")));
  assert.throws(() => parseGeneratedCaptions(response(JSON.stringify([captions[0], captions[0]])), source));
  assert.throws(() => parseGeneratedCaptions({ promptFeedback: { blockReason: "SAFETY" } }));
  assert.throws(() => parseGeneratedCaptions(response(JSON.stringify(Array.from({ length: 7 }, (_, i) => String(i))))));
});

test("captions must use one source taxon, contain descriptions, and stay off app topics", () => {
  assert.deepEqual(parseGeneratedCaptions(response(JSON.stringify(captions))), captions);
  for (const invalid of [
    [captions[0], "Octopus (Octopus vulgaris) — Has eight arms."],
    [captions[0], "Axolotl (Ambystoma mexicanum) — "],
    [captions[0], "Axolotl (Ambystoma mexicanum) — This website needs better login buttons."],
    [captions[0], "Axolotl — Keeps the gills."],
    [captions[0], "Axolotl (fake species) — Invented organs are funny."],
  ]) assert.throws(() => parseGeneratedCaptions(response(JSON.stringify(invalid)), source));
  assert.throws(() => parseGeneratedCaptions(response(JSON.stringify(captions)), { label: "Octopus (Octopus vulgaris)", notes: "Eight arms." }));
});

test("Gemini request embeds JPEG data and constrains JSON output", () => {
  const body = geminiRequest("saved prompt", "aGVsbG8=");
  assert.deepEqual(body.contents[0].parts, [{ text: "saved prompt" }, { inlineData: { mimeType: "image/jpeg", data: "aGVsbG8=" } }]);
  assert.equal(body.generationConfig.responseFormat.text.mimeType, "APPLICATION_JSON");
  assert.equal(body.generationConfig.responseFormat.text.schema.minItems, 2);
});
