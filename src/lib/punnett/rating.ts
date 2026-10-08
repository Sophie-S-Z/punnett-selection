import type { CaptionCandidate } from "./pairing.ts";

export type VoteResult = { ok: boolean; duplicate?: boolean; error?: string };
export type VoteRecord = { id: string; captionId: string; imageId: string; text: string; vote: 1 | -1; createdAt: string };
export type Page<T> = { rows: T[]; hasMore: boolean };
export const PAGE_SIZE = 500;

export function validCaptionId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid rating response.");
  return value as Record<string, unknown>;
}

function identity(value: unknown): string {
  if (typeof value !== "string" || !validCaptionId(value)) throw new Error("Invalid rating identity.");
  return value;
}

function caption(value: unknown): CaptionCandidate {
  const row = record(value);
  if (typeof row.text !== "string" || !row.text.trim() || row.text.length > 500) throw new Error("Invalid caption response.");
  return { id: identity(row.id), imageId: identity(row.imageId), text: row.text };
}

function page<T>(value: unknown, key: string, parse: (row: unknown) => T): Page<T> {
  const response = record(value);
  const rows = response[key];
  if (!Array.isArray(rows) || rows.length > PAGE_SIZE || typeof response.hasMore !== "boolean" || (response.hasMore && !rows.length)) throw new Error("Invalid rating page.");
  return { rows: rows.map(parse), hasMore: response.hasMore };
}

export function parseCaptionPage(value: unknown): Page<CaptionCandidate> {
  return page(value, "captions", caption);
}

export function parseVotedPage(value: unknown): Page<string> {
  return page(value, "ids", identity);
}

export function parseVotePage(value: unknown): Page<VoteRecord> {
  return page(value, "votes", (value) => {
    const row = record(value);
    const candidate = caption({ id: row.captionId, imageId: row.imageId, text: row.text });
    if ((row.vote !== 1 && row.vote !== -1) || typeof row.createdAt !== "string" || !Number.isFinite(Date.parse(row.createdAt))) throw new Error("Invalid vote history.");
    return { id: identity(row.id), captionId: candidate.id, imageId: candidate.imageId, text: candidate.text, vote: row.vote, createdAt: row.createdAt };
  });
}

export function voteError(error: { code?: string; message?: string }): VoteResult {
  if (error.code === "23505") return { ok: false, duplicate: true, error: "This pair has already been judged. Loading another pair." };
  if (error.code === "42501") return { ok: false, error: "Put on lab gloves before selecting a specimen." };
  return { ok: false, error: "The selection could not be saved. Please try again." };
}
