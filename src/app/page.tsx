import Link from "next/link";
import { AnnotatedText, UploadIllustration } from "@/components/lab/StudioDetails";
import { migrateCaptionImages } from "@/lib/supabase/migrateCaptionImages";
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
  if (user) { await requireCompleteProfile(); await migrateCaptionImages().catch(() => undefined); }
  const params = await searchParams;
  const image = params.image && validCaptionId(params.image) ? params.image : undefined;
  const voting = params.mode === "duel" || Boolean(image);
  let pair = null;
  let error: string | undefined;
  if (voting) { try { pair = await loadPair(user?.id ?? null, image); } catch { error = "Captions could not be loaded. Please try again."; } }
  return <div className="lab-shell"><LabHeader /><main id="main">
    <section className="caption-intro"><p className="eyebrow">A little less serious.</p><h1>Your camera roll.<br /><AnnotatedText>Now with jokes.</AnnotatedText></h1><div className="intro-aside"><span className="studio-stamp" aria-hidden="true">GOOD PHOTO.<br />BAD INFLUENCE.<span>↙</span></span><p className="intro">Photos, screenshots, questionable selfies. Turn them into funny AI captions. Keep the ones that land.</p></div><ol className="studio-steps" aria-label="How it works"><li><span>01</span> Pick an image</li><li><span>02</span> Set the tone</li><li><span>03</span> Find the funny</li></ol></section>
    <nav className="selection-modes caption-tools" aria-label="Caption tools"><Link href="/" aria-current={!voting ? "page" : undefined}><span className="tool-number" aria-hidden="true">01</span><span>Create captions<span className="mode-hint">Start with your image</span></span><span className="tool-arrow" aria-hidden="true">↗</span></Link><Link href="/?mode=duel" aria-current={voting ? "page" : undefined}><span className="tool-number" aria-hidden="true">02</span><span>Vote on captions<span className="mode-hint">Which one is funnier?</span></span><span className="tool-arrow" aria-hidden="true">↗</span></Link></nav>
    {params.auth === "failed" ? <p role="alert" className="form-error">Sign-in was not completed. Please try Google sign-in again.</p> : null}
    {voting ? <SelectionChamber key={image ?? "duel"} signedIn={Boolean(user)} initialPair={pair} initialError={error} /> : user ? <Incubator /> : <section className="caption-welcome"><div><p className="eyebrow">Make something funny</p><h2>Got a photo with potential?</h2><p>Sign in with Google to upload your image and generate captions. Add a tone or inside-joke context, then compare the results.</p><AuthControls /><Link className="text-link" href="/?mode=duel">Browse real AI captions →</Link></div><aside><UploadIllustration /><h3>A photo is a good start.</h3><p>Bring the image. Choose the mood. Take a meme back to the group chat.</p><p className="field-help">Uploads are sent to Gemini for caption generation. Completed images and captions appear in public voting.</p></aside></section>}
  </main><footer className="lab-footer"><span>Punnett / The Humor Project</span><span>Made for the group chat.</span></footer></div>;
}

