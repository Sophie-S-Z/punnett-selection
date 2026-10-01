import Link from "next/link";
import { LabHeader } from "@/components/lab/LabHeader";
import { SpecimenCard } from "@/components/lab/SpecimenCard";
import { requireUser } from "@/lib/supabase/user";
import { requireCompleteProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import type { LabSpecimen } from "@/lib/punnett/specimens";

export const dynamic = "force-dynamic";

export default async function NotebookPage() {
  const user = await requireUser();
  await requireCompleteProfile();
  const supabase = await createClient();
  const { data, error } = await supabase.from("lab_specimens").select("id, code, label, notes").order("id").returns<LabSpecimen[]>();
  return <div className="lab-shell"><LabHeader /><main id="main" className="specimen-page">
    <p className="eyebrow">Private bench · Signed in</p><h1>Lab notebook</h1>
    <p className="intro">Bench assigned to {user.email ?? "your Google account"}.</p>
    <Link className="text-link" href="/profile">Edit your lab profile</Link>
    {error ? <p className="form-error" role="alert">Specimens could not be loaded. Please reload the page.</p> : !data?.length ? <p className="intro">No specimens in this dish yet.</p> :
      <ul className="specimen-list">{data.map((row) => <li key={row.id}><SpecimenCard code={row.code} label={row.label} notes={row.notes} /></li>)}</ul>}
  </main></div>;
}
