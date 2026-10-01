import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./server";

export const currentUser = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  return error ? null : data.user;
});

export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/");
  return user;
}
