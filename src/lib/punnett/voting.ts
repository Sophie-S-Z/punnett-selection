import { validCaptionId, voteError, type VoteResult } from "./rating.ts";

type VoteStore = {
  authenticate(): Promise<boolean>;
  insertPair(winnerId: string, loserId: string): Promise<{ error?: { code?: string; message?: string } | null }>;
};

/** The server supplies a session-backed store. Identity is never accepted as vote input. */
export async function castVote(winnerId: string, loserId: string, store: VoteStore): Promise<VoteResult> {
  try {
    if (!await store.authenticate()) return voteError({ code: "42501" });
    if (typeof winnerId !== "string" || typeof loserId !== "string" || !validCaptionId(winnerId) || !validCaptionId(loserId) || winnerId === loserId) return { ok: false, error: "Choose two distinct specimens from the same image." };
    const result = await store.insertPair(winnerId, loserId);
    return result.error ? voteError(result.error) : { ok: true };
  } catch {
    return { ok: false, error: "The selection could not be saved. Please try again." };
  }
}
