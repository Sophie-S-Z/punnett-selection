type SpecimenCardProps = {
  code: string;
  label: string;
  notes: string | null;
};

export function SpecimenCard({ code, label, notes }: SpecimenCardProps) {
  return (
    <article className="specimen-card">
      <p className="eyebrow">{code}</p>
      <h2>{label}</h2>
      {notes ? <p className="specimen-notes">{notes}</p> : null}
    </article>
  );
}
