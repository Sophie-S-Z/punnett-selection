import Link from "next/link";
import { currentUser } from "@/lib/supabase/user";
import { AuthControls } from "./AuthControls";
import { getProfile } from "@/lib/supabase/profile";
import { ProfileBadge } from "./ProfileBadge";

export async function LabHeader() {
  const user = await currentUser();
  const profile = user ? await getProfile().catch(() => null) : null;
  return (
    <header className="lab-header">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Link href="/" className="brand" aria-label="Punnett Selection home">
        <span className="brand-mark" aria-hidden="true">
          p.
        </span>
        <span>
          Punnett
          <span className="brand-subtitle">Selection</span>
        </span>
      </Link>
      <div className="lab-header-tools">
        <nav className="lab-nav" aria-label="Lab sections">
          <Link href="/specimens">Specimens</Link>
          {user ? <Link href="/lab/notebook">Lab bench</Link> : null}
        </nav>
        <AuthControls signedIn={Boolean(user)} />
        {user ? <ProfileBadge name={profile?.first_name?.trim() || "Your profile"} photo={profile?.avatar_path ? `/profile/photo?v=${encodeURIComponent(profile.updated_at)}` : null} /> : null}
      </div>
    </header>
  );
}
