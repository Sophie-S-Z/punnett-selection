import Link from "next/link";
import { LabHeader } from "@/components/lab/LabHeader";
import { PersonalBench } from "@/components/lab/PersonalBench";
import { requireUser } from "@/lib/supabase/user";
import { requireCompleteProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import type { LabSpecimen } from "@/lib/punnett/specimens";
import { parseBench, type BenchSpecimen } from "@/lib/punnett/bench";
import { parseVotePage, PAGE_SIZE, type VoteRecord } from "@/lib/punnett/rating";
import { specimenCode } from "@/lib/punnett/specimenCode";

export const dynamic = "force-dynamic";

export default async function NotebookPage({ searchParams }: { searchParams: Promise<{ votesPage?: string }> }) {
  await requireUser();
  const profile = await requireCompleteProfile();
  const supabase = await createClient();
  const params = await searchParams;
  const rawPage = Number(params.votesPage ?? 0);
  const votePage = Number.isSafeInteger(rawPage) && rawPage >= 0 && rawPage <= 2000 ? rawPage : 0;
  const [bench, shared, history] = await Promise.all([
    supabase.rpc("punnett_list_bench"),
    supabase.from("lab_specimens").select("id, code, label, notes").order("id").returns<LabSpecimen[]>(),
    supabase.rpc("punnett_vote_history", { offset_input: votePage * PAGE_SIZE }),
  ]);
  let votes: VoteRecord[] = [];
  let hasMore = false;
  let historyError = Boolean(history.error);
  if (!historyError) { try { const page = parseVotePage(history.data); votes = page.rows; hasMore = page.hasMore; } catch { historyError = true; } }
  let rows: BenchSpecimen[] = [];
  let error = Boolean(bench.error);
  if (!error) { try { rows = parseBench(bench.data); } catch { error = true; } }
  return <div className="lab-shell"><LabHeader /><main id="main" className="specimen-page">
    <section className="selection-history" aria-labelledby="selection-log-title">
      <p className="eyebrow">Your notebook · newest first</p><h1 id="selection-log-title">Selection log</h1>
      <p className="intro">Your saved selection pressure. Survival ratings record one field note; paired judgments record one winner and one loser.</p>
      {historyError ? <p className="form-error" role="alert">Your selection log could not be loaded. Reload to try again.</p> : votes.length ? <ol className="specimen-list">{votes.map((vote) => <li className="specimen-card" key={vote.id}>
        <p className="eyebrow">SPC · {specimenCode(vote.captionId)} · {vote.vote === 1 ? "Thrives · Selected" : "Extinct · Not selected"}</p>
        <p className="specimen-notes">{vote.text}</p><time className="field-help" dateTime={vote.createdAt}>{new Date(vote.createdAt).toLocaleString("en-US", { timeZone: "America/New_York" })} ET</time>
      </li>)}</ol> : <p className="chamber-status">No selections recorded yet. Rate a field note in the selection ecosystem.</p>}
      <nav className="duel-controls" aria-label="Selection log pages">{votePage > 0 ? <Link className="text-link" href={`/lab/notebook?votesPage=${votePage - 1}`}>Newer selections</Link> : null}{hasMore ? <Link className="text-link" href={`/lab/notebook?votesPage=${votePage + 1}`}>Older selections</Link> : null}<Link className="lab-button" href="/">Return to selection</Link></nav>
    </section>
    <div className="bench-heading"><div><h2>Your lab bench</h2>
    <p className="intro">{profile.first_name}, this is your space to collect specimens and keep field notes.</p></div>
    <Link className="text-link" href="/specimens">Explore the shared lab →</Link></div>
    <p className="bench-boundary">Only you can access this collection. Your edits leave the shared lab unchanged.</p>
    {error ? <p className="form-error" role="alert">Your bench could not be loaded. Reload to try again.</p> : <PersonalBench initial={rows} shared={shared.data ?? []} />}
    {shared.error ? <p className="form-error" role="alert">Shared specimens could not be loaded for copying. You can still create your own. Reload to try again.</p> : !shared.data?.length ? <p className="form-error" role="alert">The shared lab returned no specimens. Ask the lab owner to check access to lab_specimens before copying.</p> : null}
  </main></div>;
}
