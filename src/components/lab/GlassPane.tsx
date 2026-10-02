import Link from "next/link";
import { AuthControls } from "./AuthControls";

export function GlassPane({ signedIn }: { signedIn: boolean }) {
  return <section className={`bench-pane ${signedIn ? "bench-open" : ""}`} aria-label="Notebook access">
    <p className="eyebrow">{signedIn ? "Gloves on · Bench open" : "Member bench · Gloves required"}</p>
    <h2>{signedIn ? "Your bench is open." : "Put on your lab gloves."}</h2>
    <p>{signedIn ? "Collect specimens, refine your notes, and make the bench your own." : "Sign in with Google to collect specimens on your own lab bench."}</p>
    {signedIn ? <div className="bench-links"><Link className="lab-button button-primary" href="/lab/notebook">Open lab bench</Link><Link className="text-link" href="/profile">Edit profile</Link></div> : <AuthControls />}
  </section>;
}
