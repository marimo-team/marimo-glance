import { SURFACE_CAPABILITIES, type SurfaceCapabilities } from "@/hosts";
import LinkOutRestore from "./LinkOutRestore";
import SiteStatus from "./SiteStatus";
import { type SiteSupport, useSiteSupport } from "./useSiteSupport";

const REPO_URL = "https://github.com/marimo-team/marimo-glance";

/**
 * What the extension does on the active tab's site, or null where it is not
 * active. A user-enabled host only renders marimo notebooks: the molab pill is
 * limited to public github.com and Colab.
 */
function capabilitiesFor(support: SiteSupport): SurfaceCapabilities | null {
  if (support.kind === "supported") return SURFACE_CAPABILITIES[support.surface];
  if (support.kind === "enabled") return { marimo: true, jupyter: false };
  return null;
}

function describe({ marimo, jupyter }: SurfaceCapabilities): string {
  if (marimo && jupyter) {
    return "Runs marimo notebooks (.py) in the page, and opens Jupyter notebooks (.ipynb) in molab.";
  }
  if (marimo) return "Runs marimo notebooks (.py) in the page.";
  return "Opens Jupyter notebooks (.ipynb) in molab.";
}

export default function App() {
  const { support, refresh } = useSiteSupport();
  const capabilities = capabilitiesFor(support);

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
        <SiteStatus
          support={support}
          description={capabilities && describe(capabilities)}
          onChange={refresh}
        />
      </div>
      <LinkOutRestore />
      <footer className="mt-3 border-t pt-3">
        <nav className="flex gap-3.5">
          <FooterLink href={REPO_URL}>Source code</FooterLink>
          <FooterLink href={`${REPO_URL}/issues`}>Report an issue</FooterLink>
          <FooterLink href={`${REPO_URL}/blob/main/PRIVACY.md`}>Privacy</FooterLink>
        </nav>
        <p className="mt-2 text-xs text-muted-foreground">
          Runs in your browser. Nothing is uploaded unless you open a notebook in molab.
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
