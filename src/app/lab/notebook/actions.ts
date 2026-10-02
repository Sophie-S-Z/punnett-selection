"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseBenchSpecimen, UUID_PATTERN, validateBench, type BenchSpecimen } from "@/lib/punnett/bench";

type Result = { error: string; specimen?: never } | { error?: never; specimen?: BenchSpecimen };

export async function changeBench(operation: "save" | "delete", id: string, revision: number, label = "", notes = ""): Promise<Result> {
  if (!["save", "delete"].includes(operation) || typeof id !== "string" || !UUID_PATTERN.test(id) ||
      !Number.isSafeInteger(revision) || revision < 0 || (operation === "delete" && revision === 0) ||
      typeof label !== "string" || typeof notes !== "string") return { error: "Invalid request. Reload your bench and try again." };
  if (operation === "save") {
    const error = validateBench(label, notes);
    if (error) return { error };
  }
  try {
    const supabase = await createClient();
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) return { error: "Your session has ended. Sign in again before changing your bench." };
    const args = { id_input: id, revision_input: revision };
    const { data, error } = operation === "save"
      ? await supabase.rpc("punnett_save_bench", { ...args, label_input: label.trim(), notes_input: notes.trim() })
      : await supabase.rpc("punnett_delete_bench", args);
    if (error) return { error: error.code === "40001"
      ? "This specimen changed or is unavailable. Reload the bench before trying again."
      : "The save could not be confirmed. Reload the bench to check its contents before retrying." };
    revalidatePath("/lab/notebook");
    return operation === "save" ? { specimen: parseBenchSpecimen(data) } : {};
  } catch {
    return { error: "The lab connection was interrupted. Reload the bench to check whether your change completed." };
  }
}
