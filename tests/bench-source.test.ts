import assert from "node:assert/strict";
import test from "node:test";
import { validateBenchSource } from "../src/lib/punnett/benchSource.ts";

test("bench saves are anchored to a real catalog source and reject arbitrary names", () => {
 const catalog = [{label:"Dead Man's Fingers (Xylaria polymorpha)",notes:"Wood-rotting fungus."}];
 assert.equal(validateBenchSource(catalog[0].label,catalog[0].notes,catalog),null);
 assert.ok(validateBenchSource("Testing","testing...",catalog));
 assert.ok(validateBenchSource("Fake species (Imaginarus fake)","Invented.",catalog));
 assert.ok(validateBenchSource(catalog[0].label,"Our website login is funny.",catalog));
 assert.ok(validateBenchSource(catalog[0].label,"",catalog));
});
