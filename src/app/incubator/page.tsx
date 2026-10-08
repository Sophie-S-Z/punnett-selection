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
  return <div className="lab-shell"><LabHeader /><main id="main" className="specimen-page incubator-page"><div className="bench-heading"><div><p className="eyebrow">Punnett · Incubator</p><h1>Culture something<br />questionable.</h1><p className="intro">Place a real image in the dish. Let AI hatch the captions. Let the lab decide what survives.</p></div><Link className="text-link" href="/">Back to selection →</Link></div><p className="ink-note">ordinary image. unexpected mutations.</p><Incubator /></main><footer className="lab-footer"><span>The Humor Project</span><span>Images and instructions saved in your culture</span></footer></div>;
}
