"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { nextPair, selectSpecimen } from "@/app/selection/actions";
import type { CaptionPair } from "@/lib/punnett/pairing";
import { specimenCode } from "@/lib/punnett/specimenCode";
import { AuthControls } from "./AuthControls";
import { LabLoader } from "./LabLoader";

type SelectionChamberProps = {
  signedIn: boolean;
  initialPair: CaptionPair | null;
  initialError?: string;
};

export function SelectionChamber({ signedIn, initialPair, initialError }: SelectionChamberProps) {
  const [pair, setPair] = useState(initialPair);
  const [error, setError] = useState(initialError ?? "");
  const [pending, setPending] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const busy = useRef(false);
  const reduceMotion = useReducedMotion();

  const loadNext = useCallback(async (previousImageId?: string) => {
    const result = await nextPair(previousImageId);
    if (result.error) throw new Error(result.error);
    setPair(result.pair);
    setWinner(null);
  }, []);

  const skip = useCallback(async () => {
    if (!signedIn || busy.current) return;
    busy.current = true;
    setPending(true);
    setError("");
    try { await loadNext(pair?.imageId); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "The next pair could not be loaded. Please try again."); }
    finally { busy.current = false; setPending(false); }
  }, [signedIn, pair, loadNext]);

  const choose = useCallback(async (side: "left" | "right") => {
    if (!signedIn || !pair || busy.current) return;
    busy.current = true;
    setPending(true);
    setError("");
    const chosen = pair[side];
    const other = pair[side === "left" ? "right" : "left"];
    try {
      const result = await selectSpecimen(chosen.id, other.id);
      if (!result.ok && !result.duplicate) throw new Error(result.error || "Your selection could not be saved. Select a specimen to try again.");
      if (result.duplicate) {
        toast("This pair was already judged. Loading the next pair.");
      } else {
        setWinner(chosen.id);
        toast.success("Selection saved.");
        // This brief pause displays the persisted result, rather than predicting a vote.
        if (!reduceMotion) await new Promise(resolve => setTimeout(resolve, 350));
      }
      setPair(null);
      await loadNext();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Your selection could not be saved. Please try again.");
    } finally { busy.current = false; setPending(false); }
  }, [signedIn, pair, reduceMotion, loadNext]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target;
      if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey ||
        (target instanceof HTMLElement && (target.isContentEditable || target.closest("input, textarea, select, [contenteditable]")))) return;
      const key = event.key.toLowerCase();
      if (!signedIn || busy.current || !pair || !["a", "b", "s"].includes(key)) return;
      event.preventDefault();
      if (key === "s") void skip();
      else void choose(key === "a" ? "left" : "right");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [signedIn, pair, choose, skip]);

  return <section className="selection-chamber" aria-label="Selection chamber" aria-busy={pending}>
    <div className="chamber-heading"><div><p className="eyebrow">Same image · Different instincts</p><h2>Which specimen earns your selection?</h2></div>{signedIn ? <Link className="text-link" href="/incubator">Culture your own →</Link> : null}</div>
    {error ? <div className="chamber-error" role="alert"><p>{error}</p><button type="button" className="lab-button button-quiet" onClick={() => signedIn ? void skip() : window.location.reload()} disabled={pending}>Try loading again</button></div> : null}
    {pair ? <div className="duel-stage">
      <div className={`duel-layout ${!signedIn ? "duel-locked" : ""}`}>
        <figure className="duel-image"><Image src={`/media/${pair.imageId}`} alt="The image used to generate both specimens" width={1200} height={900} unoptimized /><figcaption>One sample. Two competing captions.</figcaption></figure>
        <div className="duel-cards"><AnimatePresence mode="wait" initial={false}><motion.div className="duel-pair" key={`${pair.left.id}:${pair.right.id}`} initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: reduceMotion ? 0 : .2 }}>
          {(["left", "right"] as const).map((side, index) => {
            const caption = pair[side];
            const separator = caption.text.indexOf(" — ");
            return <motion.button type="button" key={caption.id} className="duel-card" disabled={!signedIn || pending} aria-pressed={winner === caption.id} aria-label={`Select specimen ${index === 0 ? "A" : "B"}: ${caption.text}`} onClick={() => void choose(side)} data-state={winner ? winner === caption.id ? "winner" : "loser" : "idle"}>
              <span className="duel-card-meta"><span className="eyebrow">SPC-{index === 0 ? "A" : "B"} · {specimenCode(caption.id)}</span><span className="duel-key" aria-hidden="true">{index === 0 ? "A" : "B"}</span></span>
              {separator > 0 ? <span className="duel-species">{caption.text.slice(0,separator)}</span> : null}
              <span className="duel-caption">{separator > 0 ? caption.text.slice(separator+3) : caption.text}</span><span className="duel-select-label">{winner === caption.id ? "Selected" : "Select specimen"}<span aria-hidden="true">↗</span></span>
            </motion.button>;
          })}
        </motion.div></AnimatePresence>
          <div className="duel-controls"><p className="field-help">{signedIn ? <><kbd>A</kbd> left · <kbd>B</kbd> right · <kbd>S</kbd> skip</> : "Put on lab gloves to select a specimen."}</p><button type="button" className="lab-button button-quiet" disabled={!signedIn || pending} onClick={() => void skip()}>Skip pair</button></div>
        </div>
      </div>
      {!signedIn ? <div className="chamber-glass"><div><span className="glass-lock" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M7 10V7a5 5 0 0 1 10 0v3M6 10h12v11H6zM12 14v3" /></svg></span><p className="eyebrow">Observe freely · Select with gloves</p><h3>Your instincts belong in the lab.</h3><p>Sign in with Google to select specimens and culture captions from your own images.</p><AuthControls /></div></div> : null}
    </div> : pending ? <LabLoader label="Sequencing…" description="Finding your next pair of unjudged specimens." /> : !error ? <div className="chamber-empty"><span className="empty-dish" aria-hidden="true" /><h3>No unjudged specimens left. Check back after the next culture.</h3>{signedIn ? <><p>Add an image to hatch a new batch of captions.</p><Link className="lab-button button-primary" href="/incubator">Place sample in dish</Link></> : <><p>Sign in to culture captions from your own images.</p><AuthControls /></>}</div> : null}
    {pending && pair ? <p className="chamber-pending" role="status">{winner ? "Selection saved. Sequencing the next pair…" : "Saving or loading your specimens…"}</p> : null}
  </section>;
}
