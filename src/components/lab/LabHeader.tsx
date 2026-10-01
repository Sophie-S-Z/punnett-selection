import Link from "next/link";
import { currentUser } from "@/lib/supabase/user";
import { AuthControls } from "./AuthControls";

export async function LabHeader() {
  const user = await currentUser();
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
          {user ? <Link href="/profile">Profile</Link> : null}
          {user ? <Link href="/lab/notebook">Notebook</Link> : null}
        </nav>
        <AuthControls signedIn={Boolean(user)} />
      </div>
    </header>
  );
}
