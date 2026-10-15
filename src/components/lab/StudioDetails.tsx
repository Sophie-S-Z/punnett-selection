"use client";
import { motion, useReducedMotion } from "motion/react";

/** A compact annotation treatment inspired by Componentry Annotated Text. */
export function AnnotatedText({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  return <span className="annotated-text">{children}<svg viewBox="0 0 240 16" preserveAspectRatio="none" aria-hidden="true"><motion.path d="M3 10C43 2 91 4 126 8S200 14 237 5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: reduce ? 0 : .5, delay: reduce ? 0 : .15 }} /></svg></span>;
}

/** Aceternity's layered upload interaction, adapted to the existing accessible uploader. */
export function UploadIllustration() {
  const reduce = useReducedMotion();
  return <motion.div className="upload-illustration" aria-hidden="true" initial="rest" whileHover={reduce ? undefined : "hover"}>
    <span className="upload-grid" />
    <motion.span className="upload-paper upload-paper-back" variants={{ rest: { rotate: -8, x: -12 }, hover: { rotate: -12, x: -22 } }} transition={{ duration: .2 }} />
    <motion.span className="upload-paper upload-paper-front" variants={{ rest: { y: 0 }, hover: { y: -8, rotate: 3 } }} transition={{ type: "spring", stiffness: 300, damping: 24 }}><svg viewBox="0 0 48 48" fill="none"><rect x="7" y="8" width="34" height="31" rx="3" /><circle cx="17" cy="18" r="3" /><path d="m8 32 10-9 9 9 6-6 8 8M24 41v-9m-4 4 4-4 4 4" /></svg><span>YOUR IMAGE HERE</span></motion.span>
  </motion.div>;
}
