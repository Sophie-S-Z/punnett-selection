import Link from "next/link";
import { LabHeader } from "@/components/lab/LabHeader";
import { PersonalBench } from "@/components/lab/PersonalBench";
import { requireUser } from "@/lib/supabase/user";
import { requireCompleteProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import { parseBench, type BenchSpecimen } from "@/lib/punnett/bench";
import type { LabSpecimen } from "@/lib/punnett/specimens";
export const dynamic = "force-dynamic";
export default async function CollectionPage() {
  await requireUser();
  await requireCompleteProfile();
  const client = await createClient();
  const [bench, shared] = await Promise.all([client.rpc("punnett_list_bench"), client.from("lab_specimens").select("id, code, label, notes").order("id").returns<LabSpecimen[]>()]);
  let rows: BenchSpecimen[] = [];
  let error = Boolean(bench.error);
  if (!error) { try { rows = parseBench(bench.data); } catch { error = true; } }
  return <div className="lab-shell"><LabHeader /><main id="main" className="specimen-page"><p className="eyebrow">Earlier collections</p><h1>Your organism notes</h1><p className="intro">Your existing private collection from the earlier biology experience.</p><Link className="text-link" href="/lab/notebook">Back to caption history →</Link>{error ? <p className="form-error" role="alert">Your collection could not be loaded. Reload to try again.</p> : <PersonalBench initial={rows} shared={shared.data ?? []} />}{shared.error || !shared.data?.length ? <p className="form-error" role="alert">The catalog could not be loaded. Ask the owner to check access to lab_specimens.</p> : null}</main></div>;
}
