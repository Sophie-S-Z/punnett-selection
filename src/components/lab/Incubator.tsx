"use client";

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { generateSpecimens } from "@/app/incubator/actions";
import type { CaptionCandidate } from "@/lib/punnett/pairing";
import { specimenCode } from "@/lib/punnett/specimenCode";
import { validateSpecimenSource, validateUpload } from "@/lib/punnett/generation";
import { prepareUpload } from "@/lib/punnett/imageUpload";
import { LabLoader } from "./LabLoader";
import { PetriDish } from "./PetriDish";

export type CatalogSpecimen = { id: number; label: string; notes: string };
type Culture = { imageId: string; captions: CaptionCandidate[]; sourceLabel: string };

export function Incubator({ specimens }: { specimens: CatalogSpecimen[] }) {
  const catalog = specimens.filter(specimen => !validateSpecimenSource(specimen));
  const [specimenId, setSpecimenId] = useState("");
  const selected = catalog.find(specimen => String(specimen.id) === specimenId);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [pending, setPending] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [culture, setCulture] = useState<Culture | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const sourceInput = useRef<HTMLSelectElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const busy = useRef(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function chooseSpecimen(id: string) {
    if (busy.current) return;
    setSpecimenId(id);
    setCulture(null);
    setError("");
  }

  function randomSpecimen() {
    if (!catalog.length || busy.current) return;
    const candidates = catalog.length > 1 ? catalog.filter(specimen => String(specimen.id) !== specimenId) : catalog;
    const sample = crypto.getRandomValues(new Uint32Array(1))[0] / 0x100000000;
    chooseSpecimen(String(candidates[Math.floor(sample * candidates.length)].id));
  }

  function removePhoto() {
    if (busy.current) return;
    setFile(null);
    setPreview(null);
    setCulture(null);
    setError("");
    if (input.current) input.current.value = "";
    if (camera.current) camera.current.value = "";
  }

  function placeSample(candidate: File | undefined) {
    if (busy.current || !candidate) return;
    const uploadError = validateUpload(candidate);
    if (uploadError) {
      setError(uploadError);
      if (input.current) input.current.value = "";
      if (camera.current) camera.current.value = "";
      setFile(null);
      setPreview(null);
      setCulture(null);
      return;
    }
    setFile(candidate);
    setPreview(URL.createObjectURL(candidate));
    setCulture(null);
    setError("");
  }

  function onFile(event: ChangeEvent<HTMLInputElement>) { placeSample(event.target.files?.[0]); }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (event.dataTransfer.files.length > 1) { setError("Place one image in the dish at a time."); return; }
    placeSample(event.dataTransfer.files[0]);
  }

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    if (!selected) { setError("Choose a source specimen from the shared lab first."); sourceInput.current?.focus(); return; }
    busy.current = true;
    setPending(true);
    setError("");
    setCulture(null);
    try {
      const body = new FormData();
      if (file) body.set("image", await prepareUpload(file));
      body.set("specimenId", String(selected.id));
      body.set("prompt", prompt);
      const result = await generateSpecimens(body);
      if (!result.ok) {
        const stage = { culturing: "Specimen preparation or saving", sequencing: "Field-note generation", hatching: "Saving field notes" }[result.stage];
        setError(`${stage} could not finish. ${result.error}`);
        return;
      }
      setCulture({ imageId: result.imageId, captions: result.captions, sourceLabel: selected.label });
      toast.success(`Field notes saved for ${selected.label}.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The culture could not finish. Check your connection and try again.");
    } finally { busy.current = false; setPending(false); }
  }

  return <div className="incubator-workbench">
    <form className="culture-form" onSubmit={event => void generate(event)} aria-busy={pending}>
      <div className="culture-upload" data-dragging={dragging} onDragOver={event => { event.preventDefault(); if (!busy.current) setDragging(true); }} onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }} onDrop={onDrop}>
        <PetriDish src={preview} state={pending ? "culturing" : culture ? "hatched" : "idle"} />
        <label className="culture-file-label" htmlFor="culture-image">{file ? file.name : "Add a field photo"}</label>
        <p className="field-help">Optional. Drop a photo of your selected species, or use its saved field facts.</p>
        <input id="culture-image" name="image" ref={input} type="file" accept="image/*" onChange={onFile} disabled={pending} aria-describedby="image-limits" />
        <div className="culture-camera"><button type="button" className="lab-button button-quiet" onClick={() => camera.current?.click()} disabled={pending}>Take a photo</button><input ref={camera} type="file" accept="image/*" capture="environment" onChange={onFile} disabled={pending} className="visually-hidden" tabIndex={-1} aria-label="Take a photo with your camera" /></div>
        <p id="image-limits" className="field-help">JPEG, PNG, WebP, or GIF. Up to 8 MB. Resized before upload.</p>
        {file ? <button type="button" className="lab-button button-quiet" onClick={removePhoto} disabled={pending}>Use field facts instead</button> : <p className="culture-photo-note">Without a photo, the lab creates a specimen card from the selected species and its saved facts.</p>}
      </div>
      <div className="culture-instructions">
        <p className="eyebrow">01 · Choose a species. 02 · Culture its field notes.</p>
        <h2>Meet something improbable.</h2>
        <p className="culture-description">Flora, fauna, and fungi from the shared lab become dry field notes. Each culture keeps its scientific name and starts with the species&apos; saved facts.</p>
        <div className="bench-field culture-source"><label htmlFor="culture-specimen">Source specimen</label><div className="culture-source-controls"><select id="culture-specimen" name="specimenId" ref={sourceInput} value={specimenId} onChange={event => chooseSpecimen(event.target.value)} required disabled={pending || !catalog.length} aria-describedby="source-help"><option value="">Choose a species from the lab</option>{catalog.map(specimen => <option key={specimen.id} value={String(specimen.id)}>{specimen.label}</option>)}</select><button type="button" className="lab-button button-quiet" onClick={randomSpecimen} disabled={pending || !catalog.length}>Pick a random specimen</button></div><p id="source-help" className="field-help">The species and facts come from the shared lab. A field photo is optional.</p></div>
        {selected ? <aside className="culture-source-facts" aria-label="Source specimen facts"><p className="eyebrow">Field facts · Shared lab</p><h3>{selected.label}</h3><p>{selected.notes}</p></aside> : null}
        <div className="bench-field"><label htmlFor="culture-prompt">Generation instructions <span className="field-optional">(optional)</span></label><textarea id="culture-prompt" name="prompt" value={prompt} onChange={event => setPrompt(event.target.value)} maxLength={300} rows={4} disabled={pending} aria-describedby="prompt-help" /><p id="prompt-help" className="field-help">Guide the tone in up to 300 characters. Your instructions are saved with the generated specimens.</p></div>
        <button className="lab-button button-primary culture-submit" type="submit" disabled={pending || !selected}>{pending ? "Culturing…" : "Hatch specimens"}<span aria-hidden="true">↗</span></button>
        <p className="culture-sharing field-help">Gemini receives the selected species, its saved facts, your instructions, and any photo you add. Successful cultures enter the public selection chamber.</p>
        {pending ? <LabLoader description="Preparing your species, generating field notes, and saving specimens. Keep this tab open." /> : null}
        {error ? <p className="form-error culture-error" role="alert">{error}</p> : null}
      </div>
    </form>
    {culture ? <section className="culture-results" aria-label="Generated specimens" aria-live="polite">
      <div className="culture-results-heading"><div><p className="eyebrow">Culture complete · Saved to the lab</p><h2>Field notes for {culture.sourceLabel}</h2></div><Link className="lab-button button-primary" href={`/?image=${encodeURIComponent(culture.imageId)}`}>Send to selection chamber<span aria-hidden="true"> ↗</span></Link></div>
      <ul className="specimen-list">{culture.captions.map((caption, index) => <motion.li key={caption.id} initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? 0 : .25, delay: reduceMotion ? 0 : index * .06 }}><article className="specimen-card"><p className="eyebrow">SPC · {specimenCode(caption.id)}</p><h3>{caption.text}</h3></article></motion.li>)}</ul>
    </section> : null}
  </div>;
}
