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
import { CaptionActions } from "./CaptionActions";
import { LabLoader } from "./LabLoader";
import Image from "next/image";

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
    if (event.dataTransfer.files.length > 1) { setError("Upload one image at a time."); return; }
    placeSample(event.dataTransfer.files[0]);
  }

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    if (!file) { setError("Upload an image first."); input.current?.focus(); return; }
    busy.current = true;
    setPending(true);
    setError("");
    setCulture(null);
    try {
      const body = new FormData();
      if (file) body.set("image", await prepareUpload(file));
      body.set("prompt", prompt);
      const result = await generateSpecimens(body);
      if (!result.ok) {
        const stage = { culturing: "Image preparation or saving", sequencing: "Caption generation", hatching: "Saving captions" }[result.stage];
        setError(`${stage} could not finish. ${result.error}`);
        return;
      }
      setCulture({ imageId: result.imageId, captions: result.captions });
      toast.success("Your captions are ready.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Caption generation could not finish. Check your connection and try again.");
    } finally { busy.current = false; setPending(false); }
  }

  return <div className="incubator-workbench">
    <form className="culture-form" onSubmit={event => void generate(event)} aria-busy={pending}>
      <div className="culture-upload" data-dragging={dragging} onDragOver={event => { event.preventDefault(); if (!busy.current) setDragging(true); }} onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }} onDrop={onDrop}>
        {preview ? <Image className="upload-preview" src={preview} alt="Your image for caption generation" width={1200} height={900} unoptimized /> : <div className="upload-placeholder" aria-hidden="true">＋</div>}
        <label className="culture-file-label" htmlFor="culture-image">{file ? file.name : "Upload an image"}</label>
        <p className="field-help">Drop an image here, or choose one from your camera roll.</p>
        <input id="culture-image" name="image" ref={input} type="file" accept="image/*" onChange={onFile} disabled={pending} aria-describedby="image-limits" />
        <div className="culture-camera"><button type="button" className="lab-button button-quiet" onClick={() => camera.current?.click()} disabled={pending}>Take a photo</button><input ref={camera} type="file" accept="image/*" capture="environment" onChange={onFile} disabled={pending} className="visually-hidden" tabIndex={-1} aria-label="Take a photo with your camera" /></div>
        <p id="image-limits" className="field-help">JPEG, PNG, WebP, or GIF. Up to 8 MB. Resized before upload.</p>
        {file ? <button type="button" className="lab-button button-quiet" onClick={removePhoto} disabled={pending}>Remove image</button> : null}
      </div>
      <div className="culture-instructions">
        <p className="eyebrow">Your image. Four different takes.</p><h2>Make it funny.</h2><p className="culture-description">Add a photo, screenshot, or meme. Generate original captions grounded in what is in your image.</p>
        <div className="bench-field"><label htmlFor="culture-prompt">Tone or context <span className="field-optional">(optional)</span></label><textarea id="culture-prompt" name="prompt" value={prompt} onChange={event => setPrompt(event.target.value)} maxLength={1000} rows={4} disabled={pending} aria-describedby="prompt-help" /><p id="prompt-help" className="field-help">Try dry humor, absurd, relatable, or add context. Up to 1,000 characters.</p></div>
        <button className="lab-button button-primary culture-submit" type="submit" disabled={pending || !file}>{pending ? "Generating captions…" : "Generate captions"}<span aria-hidden="true">↗</span></button>
        <p className="culture-sharing field-help">Your image and instructions are sent to Gemini. Completed images and captions appear in public voting. Only upload images you are comfortable sharing.</p>
        {pending ? <LabLoader label="Generating captions…" description="Preparing your image, asking AI for captions, and saving the results. Keep this tab open." /> : null}
        {error ? <p className="form-error culture-error" role="alert">{error}</p> : null}
      </div>
    </form>
    {culture ? <section className="culture-results" aria-label="Generated captions" aria-live="polite">
      <div className="culture-results-heading"><div><p className="eyebrow">AI captions · Saved</p><h2>Pick your favorite</h2></div><Link className="lab-button button-primary" href={`/?image=${encodeURIComponent(culture.imageId)}`}>Compare these captions<span aria-hidden="true"> ↗</span></Link></div>
      <ul className="specimen-list">{culture.captions.map((caption, index) => <motion.li key={caption.id} initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? 0 : .25, delay: reduceMotion ? 0 : index * .06 }}><article className="specimen-card"><Image className="caption-card-image" src={`/media/${culture.imageId}`} alt="The uploaded image for this caption" width={800} height={600} unoptimized /><p className="eyebrow">Caption · {specimenCode(caption.id)}</p><h3>{caption.text}</h3><CaptionActions text={caption.text} imageId={culture.imageId} code={specimenCode(caption.id)} /></article></motion.li>)}</ul>
    </section> : null}
  </div>;
}
