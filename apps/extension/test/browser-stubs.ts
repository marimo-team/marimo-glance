import { vi } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";

/**
 * The fake browser has no permissions API, so stand one in that reports these
 * match patterns as granted.
 */
export function grantOrigins(...patterns: string[]): void {
  vi.spyOn(fakeBrowser.permissions, "getAll").mockResolvedValue({ origins: patterns });
  vi.spyOn(fakeBrowser.permissions, "contains").mockImplementation(async ({ origins = [] }) =>
    origins.every((origin) => patterns.includes(origin)),
  );
}

/** Make the active tab report `url`, or no URL at all as browsers do without access. */
export function activeTab(url: string | undefined): void {
  vi.spyOn(fakeBrowser.tabs, "query").mockResolvedValue([
    { id: 7, url, index: 0, highlighted: true, active: true, pinned: false, incognito: false },
  ]);
}
