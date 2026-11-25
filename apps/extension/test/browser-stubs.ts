import { vi } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";

/**
 * The fake browser has no permissions API, so stand one in that reports these
 * match patterns as granted.
 */
export function grantOrigins(...patterns: string[]): void {
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

type PermissionsListener = (permissions: { origins?: string[] }) => void;

/** The fake browser has no permission events either; capture the listeners to fire them. */
export function permissionEvents(): {
  added: (permissions: { origins?: string[] }) => void;
  removed: (permissions: { origins?: string[] }) => void;
} {
  const listeners = { added: [] as PermissionsListener[], removed: [] as PermissionsListener[] };
  vi.spyOn(fakeBrowser.permissions.onAdded, "addListener").mockImplementation((listener) => {
    listeners.added.push(listener);
  });
  vi.spyOn(fakeBrowser.permissions.onRemoved, "addListener").mockImplementation((listener) => {
    listeners.removed.push(listener);
  });
  return {
    added: (permissions) => listeners.added.forEach((listener) => listener(permissions)),
    removed: (permissions) => listeners.removed.forEach((listener) => listener(permissions)),
  };
}
