import Image from "next/image";
import Link from "next/link";
import { CaptionActions } from "@/components/lab/CaptionActions";
import { LabHeader } from "@/components/lab/LabHeader";
import { requireUser } from "@/lib/supabase/user";
import { requireCompleteProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import { parseVotePage, PAGE_SIZE, type VoteRecord } from "@/lib/punnett/rating";
import { specimenCode } from "@/lib/punnett/specimenCode";
export const dynamic = "force-dynamic";
export default async function NotebookPage({ searchParams }: { searchParams: Promise<{ votesPage?: string }> }) {
  await requireUser();
  await requireCompleteProfile();
  const supabase = await createClient();
  const params = await searchParams;
  const rawPage = Number(params.votesPage ?? 0);
  const pageIndex = Number.isSafeInteger(rawPage) && rawPage >= 0 && rawPage <= 2000 ? rawPage : 0;
  const history = await supabase.rpc("punnett_vote_history", { offset_input: pageIndex * PAGE_SIZE });
  let votes: VoteRecord[] = [];
  let hasMore = false;
  let error = Boolean(history.error);
  if (!error) { try { const page = parseVotePage(history.data); votes = page.rows; hasMore = page.hasMore; } catch { error = true; } }
  return <div className="lab-shell"><LabHeader /><main id="main" className="specimen-page"><section className="selection-history" aria-labelledby="history-title">
    <div className="bench-heading"><div><p className="eyebrow">Your votes · Newest first</p><h1 id="history-title">Caption history</h1><p className="intro">The image, the punchline, and your verdict. Both chosen and passed captions stay here for comparison.</p></div><Link className="lab-button button-primary" href="/">Create captions →</Link></div>
    {error ? <p className="form-error" role="alert">Your caption history could not be loaded. Reload to try again.</p> : votes.length ? <ol className="caption-history-grid">{votes.map(vote => <li key={vote.id}><article className="history-caption"><Image className="caption-card-image" src={`/media/${vote.imageId}`} alt="The original image for this caption" width={800} height={600} unoptimized /><div className="history-caption-copy"><p className="eyebrow">{specimenCode(vote.captionId)} · <span className={vote.vote === 1 ? "verdict-chosen" : "verdict-passed"}>{vote.vote === 1 ? "Chosen" : "Passed"}</span></p><h2>{vote.text}</h2><CaptionActions text={vote.text} imageId={vote.imageId} code={specimenCode(vote.captionId)} /><time className="field-help" dateTime={vote.createdAt}>{new Date(vote.createdAt).toLocaleString("en-US", { timeZone: "America/New_York" })} ET</time><Link className="text-link" href={`/?mode=duel&image=${encodeURIComponent(vote.imageId)}`}>More captions for this image →</Link></div></article></li>)}</ol> : <div className="chamber-empty"><h2>Your first laugh goes here.</h2><p>Vote on a caption pair to save the image and both captions to your history.</p><Link className="lab-button" href="/?mode=duel">Vote on captions</Link></div>}
    <nav className="duel-controls" aria-label="Caption history pages">{pageIndex > 0 ? <Link className="text-link" href={`/lab/notebook?votesPage=${pageIndex - 1}`}>Newer votes</Link> : null}{hasMore ? <Link className="text-link" href={`/lab/notebook?votesPage=${pageIndex + 1}`}>Older votes</Link> : null}</nav>
  </section><p className="field-help"><Link href="/lab/notebook/collection">Earlier organism collections</Link></p></main></div>;
}
