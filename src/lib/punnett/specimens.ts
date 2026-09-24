export type LabSpecimen = {
  id: number;
  code: string;
  label: string;
  notes: string | null;
};

export type SpecimenQueryResult = {
  data: LabSpecimen[] | null;
  error: { message: string } | null;
};

export type SpecimenListState =
  | { kind: "error"; message: string }
  | { kind: "empty" }
  | { kind: "list"; rows: LabSpecimen[] };

const EMPTY_COPY = "No specimens in this dish yet.";

export function specimenListState(result: SpecimenQueryResult): SpecimenListState {
  if (result.error) {
    return { kind: "error", message: result.error.message };
  }
  if (!result.data || result.data.length === 0) {
    return { kind: "empty" };
  }
  return { kind: "list", rows: result.data };
}

export function emptySpecimenCopy(): string {
  return EMPTY_COPY;
}
