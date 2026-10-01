import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./server";
import { requireUser } from "./user";
import { needsProfileNames, parseProfile } from "@/lib/punnett/profile";

export const getProfile = cache(async () => {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("punnett_get_profile");
  if (error) throw new Error("Your profile could not be read. Please try again.");
  const profile = parseProfile(data);
  if (profile.id !== user.id) throw new Error("Profile identity mismatch.");
  return profile;
});

export async function requireCompleteProfile() {
  const profile = await getProfile();
  if (needsProfileNames(profile)) redirect("/profile");
  return profile;
}
