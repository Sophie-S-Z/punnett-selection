import { PAGE_SIZE, validCaptionId, type Page, type VoteResult } from "./rating.ts";

export type EcosystemSpecimen = { id: string; imageId: string; text: string; up: number; down: number };
export type EcosystemStats = { specimens: number; organisms: number; selections: number; unjudged: number };
export type EcosystemState = { specimen: EcosystemSpecimen | null; stats: EcosystemStats };

export function specimenLabel(text: string): string { return text.split(" — ")[0].trim(); }

export function parseEcosystemPage(value: unknown): Page<EcosystemSpecimen> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid ecosystem page.");
  const page = value as Record<string, unknown>;
  if (!Array.isArray(page.specimens) || page.specimens.length > PAGE_SIZE || typeof page.hasMore !== "boolean" || (page.hasMore && !page.specimens.length)) throw new Error("Invalid ecosystem page.");
  const rows = page.specimens.map((value: unknown): EcosystemSpecimen => {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid specimen.");
    const row = value as Record<string, unknown>;
    if (typeof row.id !== "string" || !validCaptionId(row.id) || typeof row.imageId !== "string" || !validCaptionId(row.imageId) || typeof row.text !== "string" || !row.text.trim() || row.text.length > 500 || typeof row.up !== "number" || !Number.isSafeInteger(row.up) || row.up < 0 || typeof row.down !== "number" || !Number.isSafeInteger(row.down) || row.down < 0) throw new Error("Invalid specimen.");
    return { id: row.id, imageId: row.imageId, text: row.text, up: row.up, down: row.down };
  });
  return { rows, hasMore: page.hasMore };
}

export function survivalFitness(up: number, down: number): number | null {
  return up + down < 5 ? null : up / (up + down);
}

export function ecosystemStats(rows: readonly EcosystemSpecimen[], judged: ReadonlySet<string>): EcosystemStats {
  return { specimens: rows.length, organisms: new Set(rows.map(row => specimenLabel(row.text))).size, selections: rows.reduce((sum, row) => sum + row.up + row.down, 0), unjudged: rows.filter(row => !judged.has(row.id)).length };
}

/** Uniform organism sampling prevents a prolific caption batch from dominating the feed. */
export function selectSurvivor(rows: readonly EcosystemSpecimen[], judged: ReadonlySet<string>, previousLabel?: string, previousId?: string, random: () => number = Math.random): EcosystemSpecimen | null {
  let candidates = rows.filter(row => !judged.has(row.id));
  if (previousId && candidates.some(row => row.id !== previousId)) candidates = candidates.filter(row => row.id !== previousId);
  if (previousLabel && candidates.some(row => specimenLabel(row.text) !== previousLabel)) candidates = candidates.filter(row => specimenLabel(row.text) !== previousLabel);
  if (!candidates.length) return null;
  const groups = new Map<string, EcosystemSpecimen[]>();
  for (const row of candidates) { const label = specimenLabel(row.text); groups.set(label, [...(groups.get(label) ?? []), row]); }
  function pick<T>(values: T[]): T { const n = random(); if (n < 0 || n >= 1 || !Number.isFinite(n)) throw new Error("Invalid random sample."); return values[Math.floor(n * values.length)]; }
  return pick(pick([...groups.values()]));
}

type SurvivalStore = { authenticate(): Promise<boolean>; insert(id: string, vote: 1 | -1): Promise<{ error?: { code?: string } | null }> };

export async function castSurvivalRating(id: unknown, vote: unknown, store: SurvivalStore): Promise<VoteResult> {
  try {
    if (!await store.authenticate()) return { ok: false, error: "Put on lab gloves before rating a specimen." };
    if (typeof id !== "string" || !validCaptionId(id) || (vote !== 1 && vote !== -1)) return { ok: false, error: "Choose a published specimen and a survival rating." };
    const result = await store.insert(id, vote);
    if (!result.error) return { ok: true };
    if (result.error.code === "23505") return { ok: false, duplicate: true, error: "This field note has already been judged. Loading another specimen." };
    if (result.error.code === "42501") return { ok: false, error: "Put on lab gloves before rating a specimen." };
  } catch { /* Return an actionable error without exposing database details. */ }
  return { ok: false, error: "The survival rating could not be saved. Please try again." };
}
