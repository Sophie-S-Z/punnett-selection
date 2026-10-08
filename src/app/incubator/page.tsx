import Link from "next/link";
import { LabHeader } from "@/components/lab/LabHeader";
import { Incubator, type CatalogSpecimen } from "@/components/lab/Incubator";
import { requireUser } from "@/lib/supabase/user";
import { requireCompleteProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import { validateSpecimenSource } from "@/lib/punnett/generation";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function IncubatorPage() {
  await requireUser();
  await requireCompleteProfile();
  const client = await createClient();
  const { data, error } = await client.from("lab_specimens").select("id, label, notes").order("id").returns<Array<{ id: number; label: string; notes: string | null }>>();
  const specimens: CatalogSpecimen[] = (data ?? []).flatMap(specimen => {
    if (!Number.isSafeInteger(specimen.id) || specimen.id <= 0 || typeof specimen.label !== "string" || typeof specimen.notes !== "string" || validateSpecimenSource({ label: specimen.label, notes: specimen.notes })) return [];
    return [{ id: specimen.id, label: specimen.label, notes: specimen.notes }];
  });
  const sourceError = error ? "The shared species catalog could not be loaded. Reload to try again." : !data?.length ? "The shared lab returned no specimens. Ask the lab owner to check access to lab_specimens." : !specimens.length ? "No specimens have a scientific name and field facts yet. Ask the lab owner to review the shared species catalog." : null;
  return <div className="lab-shell"><LabHeader /><main id="main" className="specimen-page incubator-page"><div className="bench-heading"><div><p className="eyebrow">Punnett · Incubator</p><h1>Wild species.<br />Questionable field notes.</h1><p className="intro">Choose real flora, fauna, or fungi from the shared lab. Culture funny field notes grounded in the species&apos; facts.</p></div><Link className="text-link" href="/">Back to selection →</Link></div><p className="ink-note">odd species. sober documentation.</p><p><Link className="text-link" href="/discover">Looking for something new? Discover another real species →</Link></p>{sourceError ? <p className="form-error" role="alert">{sourceError}</p> : <Incubator specimens={specimens} />}</main><footer className="lab-footer"><span>The Humor Project</span><span>Species, facts, and instructions saved with each culture</span></footer></div>;
}
