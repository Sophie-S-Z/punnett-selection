export type BenchSpecimen = {
  id: string;
  label: string;
  notes: string;
  revision: number;
  created_at: string;
  updated_at: string;
};

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validateBench(label: string, notes: string): string | null {
  if (!label.trim() || [...label.trim()].length > 200 || /\p{Cc}/u.test(label)) return "Enter a specimen name of 1 to 200 characters.";
  if ([...notes].length > 4000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(notes)) return "Use up to 4,000 characters of plain text for notes.";
  return null;
}

export function parseBenchSpecimen(value: unknown): BenchSpecimen {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid bench specimen.");
  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string" || !UUID_PATTERN.test(row.id) || typeof row.label !== "string" ||
      typeof row.notes !== "string" || validateBench(row.label, row.notes) ||
      typeof row.revision !== "number" || !Number.isSafeInteger(row.revision) || row.revision < 1 ||
      typeof row.created_at !== "string" || typeof row.updated_at !== "string" ||
      !Number.isFinite(Date.parse(row.created_at)) || !Number.isFinite(Date.parse(row.updated_at))) throw new Error("Invalid bench specimen.");
  return row as BenchSpecimen;
}

export function parseBench(value: unknown): BenchSpecimen[] {
  if (!value || typeof value !== "object" || !('specimens' in value) || !Array.isArray(value.specimens)) throw new Error("Invalid bench response.");
  return value.specimens.map(parseBenchSpecimen);
}
