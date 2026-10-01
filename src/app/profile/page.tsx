import { LabHeader } from "@/components/lab/LabHeader";
import { ProfileForm } from "@/components/lab/ProfileForm";
import { getProfile } from "@/lib/supabase/profile";
import { requireUser } from "@/lib/supabase/user";
import { needsProfileNames } from "@/lib/punnett/profile";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requireUser();
  const profile = await getProfile();
  return <div className="lab-shell"><LabHeader /><main id="main" className="specimen-page profile-page">
    <p className="eyebrow">Selection lab · Personnel record</p><h1>Your profile</h1>
    <p className="intro">{needsProfileNames(profile) ? "Before you open the notebook, add your first name and last name." : "Keep your lab record current."}</p>
    <p className="profile-account">Signed in as {user.email ?? "a Google account"}</p>
    <ProfileForm profile={profile} />
  </main></div>;
}
