"use client";

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { generateSpecimens } from "@/app/incubator/actions";
import type { CaptionCandidate } from "@/lib/punnett/pairing";
import { specimenCode } from "@/lib/punnett/specimenCode";
import { validateUpload } from "@/lib/punnett/generation";
import { prepareUpload } from "@/lib/punnett/imageUpload";
import { LabLoader } from "./LabLoader";
import { PetriDish } from "./PetriDish";

type Culture = { imageId: string; captions: CaptionCandidate[] };

export function Incubator() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [pending, setPending] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [culture, setCulture] = useState<Culture | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const busy = useRef(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

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
    if (!file) { setError("Place an image in the dish first."); input.current?.focus(); return; }
    busy.current = true;
    setPending(true);
    setError("");
    setCulture(null);
    try {
      const upload = await prepareUpload(file);
      const body = new FormData();
      body.set("image", upload);
      body.set("prompt", prompt);
      const result = await generateSpecimens(body);
      if (!result.ok) {
        const stage = { culturing: "Image preparation or saving", sequencing: "Caption generation", hatching: "Saving captions" }[result.stage];
        setError(`${stage} could not finish. ${result.error}`);
        return;
      }
      setCulture({ imageId: result.imageId, captions: result.captions });
      toast.success("Your specimens have hatched.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The culture could not finish. Check your connection and try again.");
    } finally { busy.current = false; setPending(false); }
  }

  return <div className="incubator-workbench">
    <form className="culture-form" onSubmit={event => void generate(event)} aria-busy={pending}>
      <div className="culture-upload" data-dragging={dragging} onDragOver={event => { event.preventDefault(); if (!busy.current) setDragging(true); }} onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }} onDrop={onDrop}>
        <PetriDish src={preview} state={pending ? "culturing" : culture ? "hatched" : "idle"} />
        <label className="culture-file-label" htmlFor="culture-image">{file ? file.name : "Place sample in dish"}</label>
        <p className="field-help">Drop an image here, or choose a sample below.</p>
        <input id="culture-image" name="image" ref={input} type="file" accept="image/*" onChange={onFile} disabled={pending} aria-describedby="image-limits" />
        <div className="culture-camera"><button type="button" className="lab-button button-quiet" onClick={() => camera.current?.click()} disabled={pending}>Take a photo</button><input ref={camera} type="file" accept="image/*" capture="environment" onChange={onFile} disabled={pending} className="visually-hidden" tabIndex={-1} aria-label="Take a photo with your camera" /></div>
        <p id="image-limits" className="field-help">JPEG, PNG, WebP, or GIF. Up to 8 MB. Resized before upload.</p>
      </div>
      <div className="culture-instructions">
        <p className="eyebrow">01 · Place a sample. 02 · Let it mutate.</p>
        <h2>Give the lab a direction.</h2>
        <p className="culture-description">A dorm-room oddity. A subway encounter. Your image becomes a fresh batch of captions for the selection chamber.</p>
        <div className="bench-field"><label htmlFor="culture-prompt">Generation instructions <span className="field-optional">(optional)</span></label><textarea id="culture-prompt" name="prompt" value={prompt} onChange={event => setPrompt(event.target.value)} maxLength={1000} rows={4} disabled={pending} aria-describedby="prompt-help" /><p id="prompt-help" className="field-help">Guide the tone or context. Your instructions are saved with the generated specimens.</p></div>
        <button className="lab-button button-primary culture-submit" type="submit" disabled={pending || !file}>{pending ? "Culturing…" : "Hatch specimens"}<span aria-hidden="true">↗</span></button>
        <p className="culture-sharing field-help">Gemini receives your image and instructions. Successful images and captions enter the public selection chamber. Choose images you want others to see.</p>
        {pending ? <LabLoader description="Uploading your sample, generating captions, and saving specimens. Keep this tab open." /> : null}
        {error ? <p className="form-error culture-error" role="alert">{error}</p> : null}
      </div>
    </form>
    {culture ? <section className="culture-results" aria-label="Generated specimens" aria-live="polite">
      <div className="culture-results-heading"><div><p className="eyebrow">Culture complete · Saved to the lab</p><h2>Your specimens have hatched.</h2></div><Link className="lab-button button-primary" href={`/?image=${encodeURIComponent(culture.imageId)}`}>Send to selection chamber<span aria-hidden="true"> ↗</span></Link></div>
      <ul className="specimen-list">{culture.captions.map((caption, index) => <motion.li key={caption.id} initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? 0 : .25, delay: reduceMotion ? 0 : index * .06 }}><article className="specimen-card"><p className="eyebrow">SPC · {specimenCode(caption.id)}</p><h3>{caption.text}</h3></article></motion.li>)}</ul>
    </section> : null}
  </div>;
}
