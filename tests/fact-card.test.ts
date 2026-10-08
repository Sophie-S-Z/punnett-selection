import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { specimenFactCard } from "../src/lib/punnett/factCard.ts";

test("fact cards render actual source names and escape active markup", async () => {
  const svg = specimenFactCard({label: "Dead Man's Fingers (Xylaria polymorpha)", notes: "Wood-rotting fungus."});
  assert.match(svg.replace(/<[^>]+>/g, " ").replace(/\s+/g, " "), /Xylaria polymorpha/);
  assert.match(svg, /SPECIMEN FACT CARD/);
  assert.match(svg, /Not a photograph/);
  const jpeg = await sharp(Buffer.from(svg)).jpeg().toBuffer();
  assert.equal((await sharp(jpeg).metadata()).format, "jpeg");
  const escaped = specimenFactCard({label:"<script> & \"",notes:"text"});
  assert.doesNotMatch(escaped, /<script>/);
  assert.match(escaped, /&lt;script&gt;/);
});
