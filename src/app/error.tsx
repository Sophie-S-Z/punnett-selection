"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="lab-shell specimen-page" id="main"><p className="eyebrow">Connection interrupted</p><h1>Try again.</h1><p className="intro">This request could not be completed.</p><button className="lab-button" onClick={reset}>Try again</button></main>;
}
