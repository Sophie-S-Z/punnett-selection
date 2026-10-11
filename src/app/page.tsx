import Link from "next/link";
import { LabHeader } from "@/components/lab/LabHeader";
import { SelectionChamber } from "@/components/lab/SelectionChamber";
import { Incubator } from "@/components/lab/Incubator";
import { AuthControls } from "@/components/lab/AuthControls";
import { loadPair } from "@/lib/supabase/rating";
import { validCaptionId } from "@/lib/punnett/rating";
import { currentUser } from "@/lib/supabase/user";
import { requireCompleteProfile } from "@/lib/supabase/profile";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export default async function Home({ searchParams }: { searchParams: Promise<{ auth?: string; image?: string; mode?: string }> }) {
  const user = await currentUser();
  if (user) await requireCompleteProfile();
  const params = await searchParams;
  const image = params.image && validCaptionId(params.image) ? params.image : undefined;
  const voting = params.mode === "duel" || Boolean(image);
  let pair = null;
  let error: string | undefined;
  if (voting) { try { pair = await loadPair(user?.id ?? null, image); } catch { error = "Captions could not be loaded. Please try again."; } }
  return <div className="lab-shell"><LabHeader /><main id="main">
    <section className="caption-intro"><p className="eyebrow">Punnett · AI captions for everyday comedy</p><h1>Your image.<br /><span>A better punchline.</span></h1><p className="intro">Upload a photo, get funny AI captions, and pick the one that lands. Pets, friends, screenshots, everyday chaos. All welcome.</p><p className="caption-steps">01 Upload an image <span>→</span> 02 Generate captions <span>→</span> 03 Pick your favorite</p></section>
    <nav className="selection-modes" aria-label="Caption tools"><Link href="/" aria-current={!voting ? "page" : undefined}>Create captions<span className="mode-hint">Start with your image</span></Link><Link href="/?mode=duel" aria-current={voting ? "page" : undefined}>Vote on captions<span className="mode-hint">Which one is funnier?</span></Link></nav>
    {params.auth === "failed" ? <p role="alert" className="form-error">Sign-in was not completed. Please try Google sign-in again.</p> : null}
    {voting ? <SelectionChamber key={image ?? "duel"} signedIn={Boolean(user)} initialPair={pair} initialError={error} /> : user ? <Incubator /> : <section className="caption-welcome"><div><p className="eyebrow">Make something funny</p><h2>Got a photo with potential?</h2><p>Sign in with Google to upload your image and generate captions. Add a tone or inside-joke context, then compare the results.</p><AuthControls /><Link className="text-link" href="/?mode=duel">Browse real AI captions →</Link></div><aside><h3>From camera roll to comedy.</h3><p>Your image stays beside every caption, including the ones you vote for and the ones you pass on.</p><p className="field-help">Uploads are sent to Gemini for caption generation. Completed images and captions appear in public voting.</p></aside></section>}
  </main><footer className="lab-footer"><span>The Humor Project · Columbia University</span><span>Images. AI captions. Your sense of humor.</span></footer></div>;
}
