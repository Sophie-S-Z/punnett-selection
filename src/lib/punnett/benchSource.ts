import { validateSpecimenSource } from "./generation.ts";

export function validateBenchSource(label:string, notes:string, catalog:ReadonlyArray<{label:string;notes:string|null}>):string|null {
  const source = catalog.find(row=>row.label === label.trim());
  if (!source || validateSpecimenSource({label:source.label,notes:source.notes ?? ""})) return "Choose a real organism from the public lab. Keep its common name and scientific taxon.";
  if (!notes.trim() || /\b(?:website|screenshot|login|dashboard|supabase|vercel|webpage)\b/i.test(notes)) return "Add natural-history field notes about this organism.";
  return null;
}
