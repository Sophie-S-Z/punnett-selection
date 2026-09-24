import assert from "node:assert/strict";
import test from "node:test";
import { emptySpecimenCopy, specimenListState } from "../src/lib/punnett/specimens.ts";

const row = {
  id: 1,
  code: "LAB-001",
  label: "The office mug",
  notes: "An ordinary mug under unusually serious observation.",
};

test("returns an error state when the query fails", () => {
  const state = specimenListState({ data: null, error: { message: "permission denied" } });
  assert.equal(state.kind, "error");
  if (state.kind === "error") {
    assert.equal(state.message, "permission denied");
  }
});

test("returns the empty dish when Supabase sends no rows", () => {
  const state = specimenListState({ data: [], error: null });
  assert.deepEqual(state, { kind: "empty" });
  assert.equal(emptySpecimenCopy(), "No specimens in this dish yet.");
});

test("keeps returned rows in query order", () => {
  const second = { ...row, id: 2, code: "LAB-002", label: "Second" };
  const state = specimenListState({ data: [row, second], error: null });
  assert.equal(state.kind, "list");
  if (state.kind === "list") {
    assert.deepEqual(
      state.rows.map((item) => item.id),
      [1, 2],
    );
  }
});
