import { LabHeader } from "@/components/lab/LabHeader";
import { SpecimenCard } from "@/components/lab/SpecimenCard";
import { emptySpecimenCopy, specimenListState, type LabSpecimen } from "@/lib/punnett/specimens";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {parseSpeciesCitations,type SpeciesCitation} from "@/lib/punnett/discovery";

export const dynamic = "force-dynamic";

export default async function SpecimensPage() {
  let state: ReturnType<typeof specimenListState>;
  let citations:SpeciesCitation[]=[];
  try {
    const supabase = await createClient();
    const result = await supabase
      .from("lab_specimens")
      .select("id, code, label, notes")
      .order("id")
      .returns<LabSpecimen[]>();
    state = specimenListState(result);
    const sources=await supabase.rpc("punnett_species_sources");
    if(!sources.error) {try {citations=parseSpeciesCitations(sources.data);} catch { /* Legacy catalog still renders if optional provenance is unavailable. */ }}
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
        <p className="intro">Real organisms. Unreasonable field notes. New discoveries join this shared catalog with linked taxonomy and source facts.</p>
        <Link className="text-link" href="/discover">Discover another real species →</Link>
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
                {citations.filter(source=>source.specimenId===row.id && source.label===row.label).map(source=><p className="field-help" key={source.gbifKey}>User-discovered · <a className="text-link" href={`https://www.gbif.org/species/${source.gbifKey}`} target="_blank" rel="noopener noreferrer">GBIF taxonomy</a> · <a className="text-link" href={`${source.wikipediaUrl}?oldid=${source.revision}`} target="_blank" rel="noopener noreferrer">Wikipedia facts</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a></p>)}
              </li>
            ))}
          </ul>
        ) : null}
      </main>
    </div>
  );
}
