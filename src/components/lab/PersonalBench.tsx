"use client";

import { useState } from "react";
import { changeBench } from "@/app/lab/notebook/actions";
import type { BenchSpecimen } from "@/lib/punnett/bench";
import type { LabSpecimen } from "@/lib/punnett/specimens";
import { specimenCode } from "@/lib/punnett/specimenCode";

type Editor = { id: string; revision: number; label: string; notes: string };

export function PersonalBench({ initial, shared }: { initial: BenchSpecimen[]; shared: LabSpecimen[] }) {
  const [rows, setRows] = useState(initial);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function openEditor(row?: BenchSpecimen) {
    setEditor(row ? { id: row.id, revision: row.revision, label: row.label, notes: row.notes }
      : { id: crypto.randomUUID(), revision: 0, label: "", notes: "" });
    setDeleting(null); setError(""); setMessage("");
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor || pending) return;
    setPending(true); setError(""); setMessage("");
    try {
      const result = await changeBench("save", editor.id, editor.revision, editor.label, editor.notes);
      if (result.error) { setError(result.error); return; }
      if (!result.specimen) { setError("Reload your bench to check whether the save completed."); return; }
      const saved = result.specimen;
      setRows((current) => editor.revision === 0 ? [saved, ...current.filter((row) => row.id !== saved.id)] : current.map((row) => row.id === saved.id ? saved : row));
      setEditor(null); setMessage(editor.revision === 0 ? "Specimen added to your bench." : "Specimen updated.");
    } catch { setError("The connection was interrupted. Reload to check whether the save completed."); }
    finally { setPending(false); }
  }

  async function remove(row: BenchSpecimen) {
    if (pending) return;
    setPending(true); setError(""); setMessage("");
    try {
      const result = await changeBench("delete", row.id, row.revision);
      if (result.error) { setError(result.error); return; }
      setRows((current) => current.filter((item) => item.id !== row.id));
      setDeleting(null); setMessage("Specimen removed from your bench.");
    } catch { setError("The connection was interrupted. Reload to check whether the removal completed."); }
    finally { setPending(false); }
  }

  return <section className="personal-bench" aria-label="Your specimen collection">
    <div className="bench-toolbar">
      <p className="bench-count">{rows.length} {rows.length === 1 ? "specimen" : "specimens"} on your bench</p>
      <button className="lab-button button-primary" onClick={() => openEditor()} disabled={pending || Boolean(editor)}>Add a specimen</button>
    </div>
    {error ? <p className="form-error" role="alert">{error}</p> : null}
    <p className="bench-feedback" role="status">{message}</p>
    {editor ? <form className="bench-editor" onSubmit={save}>
      <fieldset disabled={pending}>
        <legend>{editor.revision === 0 ? "New specimen" : "Edit specimen"}</legend>
        {shared.length ? <div className="bench-field">
          <label htmlFor="bench-source">Choose a real organism</label>
          <select id="bench-source" value={String(shared.find(row=>row.label===editor.label)?.id ?? "")} required onChange={(event) => {
            const row = shared.find((item) => String(item.id) === event.target.value);
            setEditor({ ...editor, label: row?.label ?? "", notes: row?.notes ?? "" });
          }}><option value="">Select flora, fauna, or fungi</option>{shared.map((row) => <option key={row.id} value={row.id}>{row.code} · {row.label}</option>)}</select>
          <p className="field-help">Keep the real taxon. Add your own funny, factual observations below.</p>
        </div> : null}
        <div className="bench-field"><label htmlFor="bench-label">Specimen name</label>
          <input id="bench-label" required maxLength={200} value={editor.label} readOnly />
        </div>
        <div className="bench-field"><label htmlFor="bench-notes">Field notes <span className="field-optional">(optional)</span></label>
          <textarea id="bench-notes" rows={4} maxLength={4000} value={editor.notes} onChange={(event) => setEditor({ ...editor, notes: event.target.value })} />
        </div>
        <div className="bench-actions"><button className="lab-button button-primary" type="submit">{pending ? "Saving…" : "Save specimen"}</button>
          <button className="lab-button button-quiet" type="button" onClick={() => { setEditor(null); setError(""); }}>Cancel</button></div>
      </fieldset>
    </form> : null}
    {!rows.length ? <div className="bench-empty"><span className="empty-dish" aria-hidden="true" /><h2>Your bench is ready.</h2><p>Add your own specimen or make a copy from the shared lab.</p></div> :
      <ul className="bench-collection">{rows.map((row) => <li key={row.id} className="bench-specimen">
        <div className="bench-specimen-code">{specimenCode(row.id)}</div>
        <div className="bench-specimen-content"><h2>{row.label}</h2>{row.notes ? <p>{row.notes}</p> : <p className="field-help">No field notes yet.</p>}</div>
        <div className="bench-row-actions">
          {deleting === row.id ? <div className="delete-confirm"><p>Remove this specimen from your bench?</p>
            <button className="lab-button button-danger" disabled={pending} onClick={() => remove(row)}>{pending ? "Removing…" : "Confirm removal"}</button>
            <button className="lab-button button-quiet" disabled={pending} onClick={() => { setDeleting(null); setError(""); }}>Keep specimen</button></div> : <>
            <button className="lab-button button-quiet" disabled={pending || Boolean(editor)} aria-label={`Edit ${row.label}`} onClick={() => openEditor(row)}>Edit</button>
            <button className="lab-button button-quiet" disabled={pending || Boolean(editor)} aria-label={`Remove ${row.label}`} onClick={() => { setDeleting(row.id); setMessage(""); setError(""); }}>Remove</button></>}
        </div>
      </li>)}</ul>}
  </section>;
}
