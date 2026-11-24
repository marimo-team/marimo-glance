import type { DismissalStore } from "@marimo/extension-runtime";
import { browser } from "wxt/browser";

const NOTEBOOKS_KEY = "dismissedNotebooks";
const SITES_KEY = "dismissedSites";

/** Bounds storage growth; the oldest entries are forgotten first. */
const MAX_ENTRIES = 500;

/** A stored list, or empty when missing or written in some other shape. */
function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry) => typeof entry === "string") : [];
}

async function readList(key: string): Promise<string[]> {
  const stored = await browser.storage.local.get(key);
  return stringList(stored[key]);
}

async function addToList(key: string, value: string): Promise<void> {
  const list = await readList(key);
  if (list.includes(value)) return;
  await browser.storage.local.set({ [key]: [...list, value].slice(-MAX_ENTRIES) });
}

interface LinkOutDismissals extends DismissalStore {
  isSiteDismissed(site: string): Promise<boolean>;
  restoreSite(site: string): Promise<void>;
}

/** The molab pill's dismissals, kept in `storage.local` and shared by every tab and the popup. */
export const linkOutDismissals: LinkOutDismissals = {
  async isDismissed({ sourceUrl, site }) {
    const stored = await browser.storage.local.get([NOTEBOOKS_KEY, SITES_KEY]);
    return (
      stringList(stored[SITES_KEY]).includes(site) ||
      stringList(stored[NOTEBOOKS_KEY]).includes(sourceUrl)
    );
  },

  async dismiss(dismissal) {
    if (dismissal.scope === "site") await addToList(SITES_KEY, dismissal.site);
    else await addToList(NOTEBOOKS_KEY, dismissal.sourceUrl);
  },

  subscribe(onChange) {
    const listener = (changes: Record<string, unknown>, area: string) => {
      if (area === "local" && (NOTEBOOKS_KEY in changes || SITES_KEY in changes)) onChange();
    };
    browser.storage.onChanged.addListener(listener);
    return () => browser.storage.onChanged.removeListener(listener);
  },

  async isSiteDismissed(site) {
    return (await readList(SITES_KEY)).includes(site);
  },

  async restoreSite(site) {
    const sites = await readList(SITES_KEY);
    await browser.storage.local.set({ [SITES_KEY]: sites.filter((entry) => entry !== site) });
  },
};
