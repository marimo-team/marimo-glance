import { browser } from "wxt/browser";
import { type Flavor, isBuiltInOrigin, readEnabledHosts } from "@/enabled-hosts";
import { supportedSite, type Surface } from "@/hosts";

export type SiteSupport =
  | { kind: "checking" }
  | { kind: "supported"; surface: Surface }
  | { kind: "enabled"; origin: string; flavor: Flavor }
  | { kind: "unsupported"; origin: string | null; tabId: number | null };

/**
 * Whether marimo Glance runs on the active tab's site, and if not, whether the
 * user could enable it. Site-level only: `supported` and `enabled` both mean the
 * extension is active on this origin, not that the current page holds a notebook.
 *
 * `unsupported` carries an origin only when enabling is possible, so the popup
 * does not offer to request a permission the browser would refuse.
 *
 * Starts as `checking` rather than `unsupported` so the popup never shows a
 * verdict it has to take back once the lookups resolve.
 *
 * `refresh` re-runs the lookup, which the popup needs after enabling or
 * disabling a host — the verdict changes without the tab changing. Only the
 * latest request's result is applied, so concurrent requests do not cause races.
 */
export function useSiteSupport(): {
  support: SiteSupport;
  refresh: () => void;
} {
  const [support, setSupport] = useState<SiteSupport>({ kind: "checking" });
  const requestId = useRef(0);

  const refresh = useCallback(() => {
    const id = ++requestId.current;
    void readActiveTabSupport().then((result) => {
      if (id === requestId.current) setSupport(result);
    });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { support, refresh };
}

async function readActiveTabSupport(): Promise<SiteSupport> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

  // Browsers withhold `tab.url` unless the extension holds the `tabs` permission
  // or a host permission covering it. Only the supported origins are requested,
  // so a URL that cannot be read belongs to a site we do not run on.
  if (!tab?.url) {
    return { kind: "unsupported", origin: null, tabId: null };
  }

  const url = new URL(tab.url);

  const builtIn = supportedSite(url);
  if (builtIn) {
    return { kind: "supported", surface: builtIn };
  }

  const enabled = await readEnabledHosts();
  const flavor = enabled[url.origin];
  if (flavor) {
    return { kind: "enabled", origin: url.origin, flavor };
  }

  // Only http(s) origins can be granted, and a built-in origin must never be
  // enabled dynamically or it would be injected twice.
  const enableable =
    (url.protocol === "https:" || url.protocol === "http:") && !isBuiltInOrigin(url.origin);

  return {
    kind: "unsupported",
    origin: enableable ? url.origin : null,
    tabId: enableable ? (tab.id ?? null) : null,
  };
}
