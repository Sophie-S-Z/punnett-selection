import Link from "next/link";
import { AuthControls } from "./AuthControls";

export function GlassPane({ signedIn }: { signedIn: boolean }) {
  return <section className={`bench-pane ${signedIn ? "bench-open" : ""}`} aria-label="Notebook access">
    <p className="eyebrow">{signedIn ? "Gloves on · Bench open" : "Member bench · Gloves required"}</p>
    <h2>{signedIn ? "Your notebook is open." : "Put on your lab gloves."}</h2>
    <p>{signedIn ? "Visit your profile or open the notebook to inspect specimens." : "Sign in with Google to open the notebook and complete your lab profile."}</p>
    {signedIn ? <div className="bench-links"><Link className="lab-button" href="/lab/notebook">Open notebook</Link><Link className="text-link" href="/profile">Edit profile</Link></div> : <AuthControls />}
  </section>;
}
