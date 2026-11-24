import { browser } from "wxt/browser";
import { type Flavor, forgetEnabledHost, originPattern, saveEnabledHost } from "@/enabled-hosts";
import { injectContentScript, syncRegistrations } from "@/registrations";

/**
 * Grant access to an origin and start the content script on it. A self-hosted
 * instance passes the platform it runs; an opt-in site passes null, because its
 * hostname already says what it is.
 *
 * Order matters: nothing is stored until the user has actually granted the
 * permission, and the script is registered before it is injected so a later page
 * load in that tab is covered too. Returns false when the user dismisses the
 * browser's permission prompt, leaving no state behind.
 */
export async function enableOrigin(
  origin: string,
  tabId: number | null,
  flavor: Flavor | null,
): Promise<boolean> {
  const granted = await browser.permissions.request({
    origins: [originPattern(origin)],
  });
  if (!granted) return false;

  if (flavor) await saveEnabledHost(origin, flavor);
  await syncRegistrations();
  if (tabId !== null) {
    await injectContentScript(tabId);
  }
  return true;
}

/**
 * Reverse of `enableOrigin`, in reverse order: stop acting on the origin before
 * dropping the permission that allowed it.
 */
export async function disableOrigin(origin: string): Promise<void> {
  await forgetEnabledHost(origin);
  await syncRegistrations();
  await browser.permissions.remove({ origins: [originPattern(origin)] });
}
