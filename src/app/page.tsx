import { LabHeader } from "@/components/lab/LabHeader";
import { SelectionChamber } from "@/components/lab/SelectionChamber";
import { loadPair } from "@/lib/supabase/rating";
import type { CaptionPair } from "@/lib/punnett/pairing";
import { validCaptionId } from "@/lib/punnett/rating";
import { currentUser } from "@/lib/supabase/user";
import { requireCompleteProfile } from "@/lib/supabase/profile";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ auth?: string; image?: string }> }) {
  const user = await currentUser();
  if (user) await requireCompleteProfile();
  const params = await searchParams;
  const preferredImage = params.image && validCaptionId(params.image) ? params.image : undefined;
  let pair: CaptionPair | null = null;
  let error: string | undefined;
  try { pair = await loadPair(user?.id ?? null, preferredImage); }
  catch { error = "The selection chamber could not load specimens. Reload to try again. The lab owner may need to complete database setup."; }
  return <div className="lab-shell"><LabHeader /><main id="main">
    <div className="chamber-heading"><div><p className="eyebrow">The Humor Project · Selection chamber</p><h1>Two specimens.<br />One survives.</h1>
      <p className="intro">Same image. Two captions. Select the one that deserves another generation.</p></div>
      <p className="ink-note">natural selection. questionable taste.</p>
    </div>
      {params.auth === "failed" ? <p role="alert" className="form-error">Sign-in was not completed. Please try Google sign-in again.</p> : null}
      <SelectionChamber key={preferredImage ?? "default"} signedIn={Boolean(user)} initialPair={pair} initialError={error} />
  </main><footer className="lab-footer"><span>The Humor Project</span><span>Fall 2026</span></footer></div>;
}
