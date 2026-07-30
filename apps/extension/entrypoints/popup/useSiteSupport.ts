import { browser } from "wxt/browser";
import { supportedSite, type Surface } from "@/hosts";

export type SiteSupport =
  | { kind: "checking" }
  | { kind: "supported"; surface: Surface }
  | { kind: "unsupported" };

/**
 * Whether marimo Glance runs on the active tab's site. Site-level only: a
 * `supported` result means the extension is active on this domain, not that the
 * current page holds a notebook.
 *
 * Starts as `checking` rather than `unsupported` so the popup never shows a
 * verdict it has to take back once the tab lookup resolves.
 */
export function useSiteSupport(): SiteSupport {
  const [support, setSupport] = useState<SiteSupport>({ kind: "checking" });

  useEffect(() => {
    let current = true;

    void readActiveTabSupport().then((res) => {
      if (current) {
        setSupport(res);
      }
    });

    return () => {
      current = false;
    };
  }, []);

  return support;
}

async function readActiveTabSupport(): Promise<SiteSupport> {
  const [tab] = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });

  // Browsers withhold `tab.url` unless the extension holds the `tabs` permission
  // or a host permission covering it. Only the supported origins are requested,
  // so a URL that cannot be read belongs to a site we do not run on.
  if (!tab?.url) {
    return { kind: "unsupported" };
  }

  const surface = supportedSite(new URL(tab.url));
  return surface ? { kind: "supported", surface } : { kind: "unsupported" };
}
