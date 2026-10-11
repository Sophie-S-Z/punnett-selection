import Link from "next/link";
import { LabHeader } from "@/components/lab/LabHeader";
import { Incubator } from "@/components/lab/Incubator";
import { requireUser } from "@/lib/supabase/user";
import { requireCompleteProfile } from "@/lib/supabase/profile";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export default async function IncubatorPage() {
  await requireUser();
  await requireCompleteProfile();
  return <div className="lab-shell"><LabHeader /><main id="main" className="specimen-page incubator-page"><div className="bench-heading"><div><p className="eyebrow">Create captions</p><h1>Give your image<br />a punchline.</h1><p className="intro">Upload any photo or meme. AI writes the captions. You choose the funniest.</p></div><Link className="text-link" href="/?mode=duel">Vote on captions →</Link></div><Incubator /></main></div>;
}
