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
      if (!result.ok && !result.duplicate) throw new Error(result.error || "Your selection could not be saved. Choose a caption to try again.");
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
    <div className="chamber-heading"><div><p className="eyebrow">Same image · Different instincts</p><h2>Which caption is funnier?</h2></div>{signedIn ? <Link className="text-link" href="/incubator">Create captions →</Link> : null}</div>
    {error ? <div className="chamber-error" role="alert"><p>{error}</p><button type="button" className="lab-button button-quiet" onClick={() => signedIn ? void skip() : window.location.reload()} disabled={pending}>Try loading again</button></div> : null}
    {pair ? <div className="duel-stage">
      <div className={`duel-layout ${!signedIn ? "duel-locked" : ""}`}>
        <figure className="duel-image"><Image src={`/media/${pair.imageId}`} alt="The image used to generate both captions" width={1200} height={900} unoptimized /><figcaption>One image. Two punchlines.</figcaption></figure>
        <div className="duel-cards"><AnimatePresence mode="wait" initial={false}><motion.div className="duel-pair" key={`${pair.left.id}:${pair.right.id}`} initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: reduceMotion ? 0 : .2 }}>
          {(["left", "right"] as const).map((side, index) => {
            const caption = pair[side];
            return <motion.button type="button" key={caption.id} className="duel-card" disabled={!signedIn || pending} aria-pressed={winner === caption.id} aria-label={`Choose caption ${index === 0 ? "A" : "B"}: ${caption.text}`} onClick={() => void choose(side)} data-state={winner ? winner === caption.id ? "winner" : "loser" : "idle"}>
              <span className="duel-card-meta"><span className="eyebrow">Caption {index === 0 ? "A" : "B"} · {specimenCode(caption.id)}</span><span className="duel-key" aria-hidden="true">{index === 0 ? "A" : "B"}</span></span>
              <span className="duel-caption">{caption.text}</span><span className="duel-select-label">{winner === caption.id ? "Selected" : "Choose caption"}<span aria-hidden="true">↗</span></span>
            </motion.button>;
          })}
        </motion.div></AnimatePresence>
          <div className="duel-controls"><p className="field-help">{signedIn ? <><kbd>A</kbd> left · <kbd>B</kbd> right · <kbd>S</kbd> skip</> : "Sign in to vote for a caption."}</p><button type="button" className="lab-button button-quiet" disabled={!signedIn || pending} onClick={() => void skip()}>Skip pair</button></div>
        </div>
      </div>
      {!signedIn ? <div className="chamber-glass"><div><span className="glass-lock" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M7 10V7a5 5 0 0 1 10 0v3M6 10h12v11H6zM12 14v3" /></svg></span><p className="eyebrow">Browse freely · Sign in to vote</p><h3>Found your favorite?</h3><p>Sign in with Google to vote or generate captions for your own image.</p><AuthControls /></div></div> : null}
    </div> : pending ? <LabLoader label="Loading captions…" description="Finding your next pair of captions." /> : !error ? <div className="chamber-empty"><span className="empty-dish" aria-hidden="true" /><h3>{signedIn ? "No unrated caption pairs right now." : "No caption pairs yet."}</h3>{signedIn ? <><p>Upload an image to create more captions.</p><Link className="lab-button button-primary" href="/incubator">Create captions</Link></> : <><p>Sign in to create captions from your own images.</p><AuthControls /></>}</div> : null}
    {pending && pair ? <p className="chamber-pending" role="status">{winner ? "Vote saved. Loading the next pair…" : "Saving or loading captions…"}</p> : null}
  </section>;
}
