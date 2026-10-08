import Link from "next/link";
import { LabHeader } from "@/components/lab/LabHeader";
import { SelectionChamber } from "@/components/lab/SelectionChamber";
import { EcosystemChamber } from "@/components/lab/EcosystemChamber";
import { AmbientCulture } from "@/components/lab/AmbientCulture";
import { loadPair } from "@/lib/supabase/rating";
import { loadEcosystem } from "@/lib/supabase/ecosystem";
import type { EcosystemState } from "@/lib/punnett/ecosystem";
import type { CaptionPair } from "@/lib/punnett/pairing";
import { validCaptionId } from "@/lib/punnett/rating";
import { currentUser } from "@/lib/supabase/user";
import { requireCompleteProfile } from "@/lib/supabase/profile";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ auth?: string; image?: string; mode?: string }> }) {
  const user = await currentUser();
  if (user) await requireCompleteProfile();
  const params = await searchParams;
  const preferredImage = params.image && validCaptionId(params.image) ? params.image : undefined;
  const duel = params.mode === "duel" || Boolean(preferredImage);
  let pair: CaptionPair | null = null;
  let ecosystem: EcosystemState | null = null;
  let error: string | undefined;
  try {
    if (duel) pair = await loadPair(user?.id ?? null, preferredImage);
    else ecosystem = await loadEcosystem(user?.id ?? null);
  } catch {
    error = "The lab could not load specimens. Reload to try again. The lab owner may need to complete database setup.";
  }
  return <div className="lab-shell ecosystem-shell"><LabHeader /><main id="main">
    <section className="ecosystem-intro" aria-labelledby="ecosystem-title">
      <div className="ecosystem-intro-copy">
        <p className="eyebrow"><span className="status-dot" aria-hidden="true" /> The Humor Project · Living comedy lab</p>
        <h1 id="ecosystem-title">Nature is weird.<br /><span>Let the funny survive.</span></h1>
        <p className="intro">Real flora, fauna, and fungi. Wild AI field notes. Apply a little selection pressure to the descriptions that deserve another generation.</p>
      </div>
      <aside className="ecosystem-signal" aria-label="About the living lab">
        <AmbientCulture />
        <div className="signal-readout"><p className="eyebrow">Observation protocol</p><p>Real biology.<br /><span>Questionable commentary.</span></p><Link href="/discover">Discover an organism <span aria-hidden="true">↗</span></Link></div>
      </aside>
    </section>
    <nav className="selection-modes" aria-label="Rating mode">
      <Link href="/?mode=survival" aria-current={!duel ? "page" : undefined}><span aria-hidden="true">◉</span> Survival ratings<span className="mode-hint">One field note</span></Link>
      <Link href="/?mode=duel" aria-current={duel ? "page" : undefined}><span aria-hidden="true">⇄</span> Paired captions<span className="mode-hint">Two competing accounts</span></Link>
    </nav>
    {params.auth === "failed" ? <p role="alert" className="form-error">Sign-in was not completed. Please try Google sign-in again.</p> : null}
    {duel ? <SelectionChamber key={preferredImage ?? "duel"} signedIn={Boolean(user)} initialPair={pair} initialError={error} />
      : <EcosystemChamber signedIn={Boolean(user)} initialState={ecosystem} initialError={error} />}
  </main><footer className="lab-footer"><span>The Humor Project · Columbia University</span><span>Real organisms. Evolving jokes.</span></footer></div>;
}
