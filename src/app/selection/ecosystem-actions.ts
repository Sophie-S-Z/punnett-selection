"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { loadEcosystem } from "@/lib/supabase/ecosystem";
import { castSurvivalRating, type EcosystemState } from "@/lib/punnett/ecosystem";
import { validCaptionId, type VoteResult } from "@/lib/punnett/rating";

export async function rateSpecimen(id: string, vote: 1 | -1): Promise<VoteResult> {
  try {
    const client = await createClient();
    const result = await castSurvivalRating(id, vote, {
      authenticate: async () => { const { data, error } = await client.auth.getUser(); return Boolean(data.user && !error); },
      insert: async (captionId, value) => client.rpc("punnett_rate_specimen", { caption_id_input: captionId, vote_input: value }),
    });
    if (result.ok) { revalidatePath("/"); revalidatePath("/lab/notebook"); }
    return result;
  } catch { return { ok: false, error: "The survival rating could not be saved. Please try again." }; }
}

export async function nextSpecimen(previousLabel?: string, previousId?: string): Promise<{ state?: EcosystemState; error?: string }> {
  try {
    if ((previousLabel !== undefined && (typeof previousLabel !== "string" || previousLabel.length > 300)) || (previousId !== undefined && (typeof previousId !== "string" || !validCaptionId(previousId)))) return { error: "Invalid specimen request." };
    const client = await createClient();
    const { data, error } = await client.auth.getUser();
    if (!data.user || error) return { error: "Put on lab gloves before observing another specimen." };
    return { state: await loadEcosystem(data.user.id, previousLabel, previousId) };
  } catch { return { error: "Specimens could not be loaded. Please try again." }; }
}
