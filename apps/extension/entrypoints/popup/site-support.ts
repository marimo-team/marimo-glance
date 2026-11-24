import { browser } from "wxt/browser";
import { type Flavor, originPattern, readEnabledHosts } from "@/enabled-hosts";
import { type BuiltInSurface, builtInSite, type OptInSurface, optInSite } from "@/hosts";

export type SiteSupport =
  | { kind: "checking" }
  | { kind: "built-in"; surface: BuiltInSurface; hostname: string }
  | {
      kind: "opt-in";
      surface: OptInSurface;
      origin: string;
      enabled: boolean;
      tabId: number | null;
    }
  | { kind: "self-hosted"; origin: string; flavor: Flavor }
  | { kind: "unsupported"; origin: string | null; tabId: number | null };

/**
 * Whether marimo Glance runs on the active tab's site, and if not, whether the
 * user could enable it. `unsupported` carries an origin only when enabling is
 * possible, so the popup does not offer a permission the browser would refuse.
 */
export async function readActiveTabSupport(): Promise<SiteSupport> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

  // Browsers withhold `tab.url` without host access to the page. `activeTab`
  // grants it for the tab the popup opened on, so a missing URL is a page no
  // extension may read, such as the browser's own settings.
  if (!tab?.url) {
    return { kind: "unsupported", origin: null, tabId: null };
  }

  const url = new URL(tab.url);
  const tabId = tab.id ?? null;

  const builtIn = builtInSite(url);
  if (builtIn) {
    return { kind: "built-in", surface: builtIn, hostname: url.hostname };
  }

  const optIn = optInSite(url);
  if (optIn) {
    const enabled = await browser.permissions.contains({ origins: [originPattern(url.origin)] });
    return { kind: "opt-in", surface: optIn, origin: url.origin, enabled, tabId };
  }

  const enabled = await readEnabledHosts();
  const flavor = enabled[url.origin];
  if (flavor) {
    return { kind: "self-hosted", origin: url.origin, flavor };
  }

  // Only http(s) origins can be granted. Known sites returned above.
  const enableable = url.protocol === "https:" || url.protocol === "http:";

  return {
    kind: "unsupported",
    origin: enableable ? url.origin : null,
    tabId: enableable ? tabId : null,
  };
}
