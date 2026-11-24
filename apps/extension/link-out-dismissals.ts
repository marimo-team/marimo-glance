import type { DismissalScope, DismissalStore } from "@marimo/extension-runtime";
import { browser } from "wxt/browser";

const NOTEBOOKS_KEY = "dismissedNotebooks";
const SITES_KEY = "dismissedSites";

/** Bounds storage growth; the oldest dismissed notebooks are forgotten first. */
const MAX_DISMISSED_NOTEBOOKS = 500;

async function readList(key: string): Promise<string[]> {
  const stored = await browser.storage.local.get(key);
  return (stored[key] as string[] | undefined) ?? [];
}

async function addToList(key: string, value: string, max?: number): Promise<void> {
  const list = await readList(key);
  if (list.includes(value)) return;
  await browser.storage.local.set({ [key]: [...list, value].slice(max ? -max : undefined) });
}

export const linkOutDismissals: DismissalStore = {
  async isDismissed(sourceUrl) {
    const [notebooks, sites] = await Promise.all([readList(NOTEBOOKS_KEY), readList(SITES_KEY)]);
    return sites.includes(new URL(sourceUrl).hostname) || notebooks.includes(sourceUrl);
  },

  async dismiss(sourceUrl, scope: DismissalScope) {
    if (scope === "site") {
      await addToList(SITES_KEY, new URL(sourceUrl).hostname);
    } else {
      await addToList(NOTEBOOKS_KEY, sourceUrl, MAX_DISMISSED_NOTEBOOKS);
    }
  },
};

export async function isSiteDismissed(hostname: string): Promise<boolean> {
  return (await readList(SITES_KEY)).includes(hostname);
}

export async function restoreSite(hostname: string): Promise<void> {
  const sites = await readList(SITES_KEY);
  await browser.storage.local.set({ [SITES_KEY]: sites.filter((site) => site !== hostname) });
}
