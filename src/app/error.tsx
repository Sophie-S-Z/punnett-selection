"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="lab-shell specimen-page" id="main"><p className="eyebrow">Lab connection interrupted</p><h1>Try the bench again.</h1><p className="intro">The lab could not finish this request.</p><button className="lab-button" onClick={reset}>Try again</button></main>;
}
