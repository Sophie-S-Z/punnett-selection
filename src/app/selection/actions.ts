"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { loadPair } from "@/lib/supabase/rating";
import type { VoteResult } from "@/lib/punnett/rating";
import { castVote } from "@/lib/punnett/voting";

export async function selectSpecimen(winnerId: string, loserId: string): Promise<VoteResult> {
  try {
    const client = await createClient();
    const result = await castVote(winnerId, loserId, {
      authenticate: async () => { const { data, error } = await client.auth.getUser(); return Boolean(data.user && !error); },
      insertPair: async (winner, loser) => client.rpc("punnett_select_vote", { winner_id_input: winner, loser_id_input: loser }),
    });
    if (result.ok) revalidatePath("/lab/notebook");
    return result;
  } catch {
    return { ok: false, error: "The selection could not be saved. Please try again." };
  }
}

export async function nextPair(previousImageId?: string) {
  try {
    const client = await createClient();
    const { data, error } = await client.auth.getUser();
    if (!data.user || error) return { pair: null, error: "Put on lab gloves before loading another pair." };
    return { pair: await loadPair(data.user.id, undefined, previousImageId) };
  } catch {
    return { pair: null, error: "Specimens could not be loaded. Please try again." };
  }
}
