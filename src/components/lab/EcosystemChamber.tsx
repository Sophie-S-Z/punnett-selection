"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { nextSpecimen, rateSpecimen } from "@/app/selection/ecosystem-actions";
import { specimenLabel, survivalFitness, type EcosystemState } from "@/lib/punnett/ecosystem";
import { specimenCode } from "@/lib/punnett/specimenCode";
import { AuthControls } from "./AuthControls";

type Props = { signedIn: boolean; initialState: EcosystemState | null; initialError?: string };

export function EcosystemChamber({ signedIn, initialState, initialError }: Props) {
  const [state, setState] = useState(initialState);
  const [error, setError] = useState(initialError ?? "");
  const [pending, setPending] = useState(false);
  const [outcome, setOutcome] = useState<1 | -1 | null>(null);
  const busy = useRef(false);
  const reduced = useReducedMotion();
  const specimen = state?.specimen;
  const loadNext = useCallback(async (label?: string, id?: string) => {
    const result = await nextSpecimen(label, id);
    if (result.error || !result.state) throw new Error(result.error || "The next field note could not be loaded.");
    setState(result.state); setOutcome(null);
  }, []);
  const observe = useCallback(async (vote?: 1 | -1) => {
    if (!signedIn || busy.current) return;
    busy.current = true; setPending(true); setError("");
    try {
      if (vote && specimen) {
        const result = await rateSpecimen(specimen.id, vote);
        if (!result.ok && !result.duplicate) throw new Error(result.error || "Your rating could not be saved. Please try again.");
        if (result.duplicate) toast("This field note was already rated. Loading another.");
        else {
          setOutcome(vote);
          toast.success(vote === 1 ? "Thrives. Rating saved." : "Extinct. Rating saved.");
          if (!reduced) await new Promise(resolve => setTimeout(resolve, 250));
        }
      }
      await loadNext(specimen ? specimenLabel(specimen.text) : undefined, specimen?.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The lab could not save your rating. Please try again.");
    } finally { busy.current = false; setPending(false); }
  }, [signedIn, specimen, reduced, loadNext]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target;
      if (!signedIn || !specimen || busy.current || event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey ||
        (target instanceof HTMLElement && (target.isContentEditable || target.closest("input, textarea, select, [contenteditable]")))) return;
      const key = event.key.toLowerCase();
      if (!["t", "e", "s"].includes(key)) return;
      event.preventDefault(); void observe(key === "t" ? 1 : key === "e" ? -1 : undefined);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [signedIn, specimen, observe]);
  const label = specimen ? specimenLabel(specimen.text) : "";
  const match = label.match(/^(.*?)\s+\(([^)]+)\)$/);
  const description = specimen?.text.slice(label.length).replace(/^\s*[—–-]\s*/, "") ?? "";
  const fitness = specimen ? survivalFitness(specimen.up, specimen.down) : null;
  return <section className="ecosystem-chamber" aria-label="Survival ratings" aria-busy={pending}>
    <div className="ecosystem-section-heading"><div><p className="eyebrow">Selection pressure</p><h2>Does this field note survive?</h2></div><p>Rate the joke.<br /><span>The organism is doing its best.</span></p></div>
    {error ? <div className="chamber-error" role="alert"><p>{error}</p>{signedIn ? <button className="lab-button button-quiet" disabled={pending} onClick={() => void observe()}>Reload field notes</button> : <button className="lab-button button-quiet" onClick={() => window.location.reload()}>Reload the lab</button>}</div> : null}
    <div className="ecosystem-layout">
      <div className="survival-stage">
        <AnimatePresence mode="wait" initial={false}>
          {specimen ? <motion.article key={specimen.id} className="survival-card" data-outcome={outcome === 1 ? "thrives" : outcome === -1 ? "extinct" : "observing"}
            initial={reduced ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={reduced ? { opacity: 1 } : { opacity: 0, y: -5 }} transition={{ duration: reduced ? 0 : .2 }}
            onPointerMove={event => { if (reduced || event.pointerType !== "mouse") return; const bounds = event.currentTarget.getBoundingClientRect(); event.currentTarget.style.setProperty("--spot-x", `${event.clientX - bounds.left}px`); event.currentTarget.style.setProperty("--spot-y", `${event.clientY - bounds.top}px`); }}>
            <div className="survival-card-meta"><p className="eyebrow">SPC · {specimenCode(specimen.id)}</p><span className="field-note-badge">AI field note</span></div>
            <div className="survival-taxon"><p className="eyebrow">Observed in the wild</p><h3>{match?.[1] ?? label}</h3>{match ? <p className="scientific-name"><i>{match[2]}</i></p> : null}</div>
            <p className="survival-description">{description}</p>
            <div className="survival-rating-controls">
              <button className="survival-vote thrives" disabled={!signedIn || pending} onClick={() => void observe(1)} aria-label="Thrives — funny"><span className="vote-symbol" aria-hidden="true">↗</span><span>Thrives<small>Funny. Keep this one.</small></span><kbd>T</kbd></button>
              <button className="survival-vote extinct" disabled={!signedIn || pending} onClick={() => void observe(-1)} aria-label="Extinct — not funny"><span className="vote-symbol" aria-hidden="true">↘</span><span>Extinct<small>Not funny. Retire it.</small></span><kbd>E</kbd></button>
            </div>
            <div className="survival-card-footer"><button className="observation-skip" disabled={!signedIn || pending} onClick={() => void observe()}>Keep observing <kbd>S</kbd></button><span>{pending ? "Recording observation…" : "Skip leaves no rating"}</span></div>
          </motion.article> : !error ? <div className="chamber-empty"><p className="eyebrow">Observation complete</p><h3>No unjudged specimens left. Check back after the next culture.</h3><p>Discover a real organism or hatch new accounts of a saved specimen.</p><Link href="/discover" className="lab-button button-primary">Discover an organism</Link></div> : null}
        </AnimatePresence>
      </div>
      <aside className="ecosystem-aside" aria-label="Selection readout">
        {!signedIn ? <div className="survival-access glass-panel"><p className="eyebrow">Observer access</p><h3>Put your taste<br />under the microscope.</h3><p>Sign in with Google to rate field notes, discover real organisms, and save your own lab bench.</p><AuthControls signedIn={false} /></div> : null}
        <div className="fitness-panel glass-panel"><p className="eyebrow">Field note fitness</p><div className="fitness-value">{fitness === null ? "—" : `${Math.round(fitness * 100)}%`}<span>{fitness === null ? "Needs more observations" : "of ratings say thrives"}</span></div><div className="fitness-track" aria-hidden="true"><span style={{ width: `${fitness === null ? 0 : fitness * 100}%` }} /></div><p>{specimen ? `${specimen.up + specimen.down} ratings · ${specimen.up} thrives · ${specimen.down} extinct` : "No field note selected"}</p><small>Shown after 5 ratings. Comedy fitness measures the description, never the species.</small></div>
        {state ? <dl className="ecosystem-counts"><div><dt>Organisms in rotation</dt><dd>{state.stats.organisms}</dd></div><div><dt>Field notes in the lab</dt><dd>{state.stats.specimens}</dd></div><div><dt>Recorded selections</dt><dd>{state.stats.selections}</dd></div>{signedIn ? <div><dt>Your unjudged notes</dt><dd>{state.stats.unjudged}</dd></div> : null}</dl> : null}
        {specimen ? <details className="specimen-media"><summary>View culture reference <span aria-hidden="true">↗</span></summary><figure><Image src={`/media/${specimen.imageId}`} alt={`Stored culture reference for ${label}; it may be a labeled fact card rather than a photograph.`} width={800} height={600} unoptimized /><figcaption>Stored generation reference. A labeled fact card is not a photograph.</figcaption></figure></details> : null}
        <Link className="ecosystem-discover" href="/discover"><span className="eyebrow">Expand the gene pool</span><span>Find something<br />stranger.</span><span className="discover-arrow" aria-hidden="true">↗</span><small>Real organisms. Linked sources. New field notes.</small></Link>
      </aside>
    </div>
    <p className="visually-hidden" role="status">{pending ? "Recording observation. Please wait." : specimen ? "Field note ready for observation." : "No unjudged field notes are available."}</p>
  </section>;
}
