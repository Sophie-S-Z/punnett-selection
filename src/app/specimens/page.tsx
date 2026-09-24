import { LabHeader } from "@/components/lab/LabHeader";
import { SpecimenCard } from "@/components/lab/SpecimenCard";
import { emptySpecimenCopy, specimenListState, type LabSpecimen } from "@/lib/punnett/specimens";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SpecimensPage() {
  let state: ReturnType<typeof specimenListState>;
  try {
    const supabase = await createClient();
    const result = await supabase
      .from("lab_specimens")
      .select("id, code, label, notes")
      .order("id")
      .returns<LabSpecimen[]>();
    state = specimenListState(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "The dish could not be read.";
    state = { kind: "error", message };
  }

  return (
    <div className="lab-shell">
      <LabHeader />
      <main id="main" className="specimen-page">
        <p className="eyebrow">Selection lab · Specimen dish</p>
        <h1>Specimens</h1>
        {state.kind === "error" ? (
          <p className="specimen-error" role="alert">
            The dish could not be read. {state.message}
          </p>
        ) : null}
        {state.kind === "empty" ? <p className="intro">{emptySpecimenCopy()}</p> : null}
        {state.kind === "list" ? (
          <ul className="specimen-list">
            {state.rows.map((row) => (
              <li key={row.id}>
                <SpecimenCard code={row.code} label={row.label} notes={row.notes} />
              </li>
            ))}
          </ul>
        ) : null}
      </main>
    </div>
  );
}
