import { ISSUES_URL, PRIVACY_URL, REPO_URL } from "./links";
import SiteStatus from "./SiteStatus";
import { useSiteSupport } from "./useSiteSupport";

export default function App() {
  const { support, refresh } = useSiteSupport();

  return (
    <div>
      <div className="flex items-center gap-2.5">
        <img className="size-8 shrink-0" src="/icon/marimo.png" alt="marimo logo" />
        <h1 className="text-[15px] font-semibold">marimo Glance</h1>
      </div>
      {support.kind === "unsupported" && (
        <p className="mt-3 text-muted-foreground">
          Run marimo notebooks right in the page on GitHub, gists, and GitLab. Open Jupyter
          notebooks in molab.
        </p>
      )}
      <div className="mt-3">
        <SiteStatus support={support} onChange={refresh} />
      </div>
      <footer className="mt-3 border-t pt-3">
        <nav className="flex gap-3.5">
          <FooterLink href={REPO_URL}>Source code</FooterLink>
          <FooterLink href={ISSUES_URL}>Report an issue</FooterLink>
          <FooterLink href={PRIVACY_URL}>Privacy</FooterLink>
        </nav>
        <p className="mt-2 text-xs text-muted-foreground">
          Runs in your browser. Nothing leaves it unless you open a notebook in molab.
        </p>
      </footer>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: string }) {
  return (
    <a className="text-primary hover:underline" href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}
