import Link from "next/link";

export function LabHeader() {
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
        </nav>
        <span className="eyebrow">Comedy genetics lab</span>
      </div>
    </header>
  );
}
