import { browser } from "wxt/browser";
import { originPattern, readEnabledOrigins } from "@/enabled-hosts";
import { type BuiltInSurface, builtInSite, type OptInSurface, optInSite } from "@/hosts";

export type SiteSupport =
  | { kind: "checking" }
  | { kind: "built-in"; surface: BuiltInSurface; hostname: string }
  | { kind: "opt-in"; surface: OptInSurface; origin: string; enabled: boolean }
  | { kind: "self-hosted"; origin: string }
  | { kind: "unsupported"; origin: string | null };

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
    return { kind: "unsupported", origin: null };
  }

  const url = new URL(tab.url);

  const builtIn = builtInSite(url);
  if (builtIn) {
    return { kind: "built-in", surface: builtIn, hostname: url.hostname };
  }

  const optIn = optInSite(url);
  if (optIn) {
    const enabled = await browser.permissions.contains({ origins: [originPattern(url.origin)] });
    return { kind: "opt-in", surface: optIn, origin: url.origin, enabled };
  }

  const { selfHosted } = await readEnabledOrigins();
  if (url.origin in selfHosted) {
    return { kind: "self-hosted", origin: url.origin };
  }

  // Only http(s) origins can be granted. Known sites returned above.
  const enableable = url.protocol === "https:" || url.protocol === "http:";

  return { kind: "unsupported", origin: enableable ? url.origin : null };
}
