import { currentUser } from "@/lib/supabase/user";
import { getProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
  if (!(await currentUser())) return new Response(null, { status: 401, headers });
  try {
    const profile = await getProfile();
    if (!profile.avatar_path) return new Response(null, { status: 404, headers });
    const supabase = await createClient();
    const { data, error } = await supabase.storage.from("profile-photos").download(profile.avatar_path);
    if (error || !data) return new Response(null, { status: 404, headers });
    return new Response(data, { headers: { ...headers, "Content-Type": data.type } });
  } catch {
    return new Response(null, { status: 503, headers });
  }
}
