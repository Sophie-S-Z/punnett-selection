import { LabHeader } from "@/components/lab/LabHeader";
import { GlassPane } from "@/components/lab/GlassPane";
import { currentUser } from "@/lib/supabase/user";
import { requireCompleteProfile } from "@/lib/supabase/profile";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ auth?: string }> }) {
  const user = await currentUser();
  if (user) await requireCompleteProfile();
  const params = await searchParams;
  return <div className="lab-shell"><LabHeader /><main id="main" className="welcome">
    <div><p className="eyebrow">The Humor Project · Columbia University</p><h1>Comedy.<br />Under observation.</h1>
      <p className="intro">Welcome to Punnett Selection, a comedy genetics lab. A place to study what makes a specimen funny.</p>
      {params.auth === "failed" ? <p role="alert" className="form-error">Sign-in was not completed. Please try Google sign-in again.</p> : null}
      <GlassPane signedIn={Boolean(user)} />
      <p className="ink-note">a little curiosity. questionable specimens.</p>
    </div>
    <div className="dish-study" role="img" aria-label="An abstract petri dish with a four-cell Punnett square"><div className="dish-ring"><div className="punnett-grid"><span>A</span><span>C</span><span>G</span><span>T</span></div></div><p className="eyebrow">Punnett · Selection lab</p></div>
  </main><footer className="lab-footer"><span>The Humor Project</span><span>Fall 2026</span></footer></div>;
}
