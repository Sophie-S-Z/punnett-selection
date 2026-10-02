import Link from "next/link";
import { LabHeader } from "@/components/lab/LabHeader";
import { PersonalBench } from "@/components/lab/PersonalBench";
import { requireUser } from "@/lib/supabase/user";
import { requireCompleteProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import type { LabSpecimen } from "@/lib/punnett/specimens";
import { parseBench, type BenchSpecimen } from "@/lib/punnett/bench";

export const dynamic = "force-dynamic";

export default async function NotebookPage() {
  await requireUser();
  const profile = await requireCompleteProfile();
  const supabase = await createClient();
  const [bench, shared] = await Promise.all([
    supabase.rpc("punnett_list_bench"),
    supabase.from("lab_specimens").select("id, code, label, notes").order("id").returns<LabSpecimen[]>(),
  ]);
  let rows: BenchSpecimen[] = [];
  let error = Boolean(bench.error);
  if (!error) { try { rows = parseBench(bench.data); } catch { error = true; } }
  return <div className="lab-shell"><LabHeader /><main id="main" className="specimen-page">
    <div className="bench-heading"><div><h1>Your lab bench</h1>
    <p className="intro">{profile.first_name}, this is your space to collect specimens and keep field notes.</p></div>
    <Link className="text-link" href="/specimens">Explore the shared lab →</Link></div>
    <p className="bench-boundary">Only you can access this collection. Your edits leave the shared lab unchanged.</p>
    {error ? <p className="form-error" role="alert">Your bench could not be loaded. Reload to try again.</p> : <PersonalBench initial={rows} shared={shared.data ?? []} />}
    {shared.error ? <p className="form-error" role="alert">Shared specimens could not be loaded for copying. You can still create your own. Reload to try again.</p> : !shared.data?.length ? <p className="form-error" role="alert">The shared lab returned no specimens. Ask the lab owner to check access to lab_specimens before copying.</p> : null}
  </main></div>;
}
