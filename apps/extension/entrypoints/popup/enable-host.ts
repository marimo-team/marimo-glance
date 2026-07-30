import { browser } from "wxt/browser";
import { type Flavor, forgetEnabledHost, originPattern, saveEnabledHost } from "@/enabled-hosts";
import { injectContentScript, syncRegistrations } from "@/registrations";

/**
 * Grant access to an origin and start rendering notebooks on it.
 *
 * Order matters: nothing is stored until the user has actually granted the
 * permission, and the script is registered before it is injected so a later page
 * load in that tab is covered too. Returns false when the user dismisses the
 * browser's permission prompt, leaving no state behind.
 */
export async function enableHost(
  origin: string,
  flavor: Flavor,
  tabId: number | null,
): Promise<boolean> {
  const granted = await browser.permissions.request({
    origins: [originPattern(origin)],
  });
  if (!granted) return false;

  await saveEnabledHost(origin, flavor);
  await syncRegistrations();
  if (tabId !== null) {
    await injectContentScript(tabId);
  }
  return true;
}

/**
 * Reverse of `enableHost`, in reverse order: stop acting on the origin before
 * dropping the permission that allowed it.
 */
export async function disableHost(origin: string): Promise<void> {
  await forgetEnabledHost(origin);
  await syncRegistrations();
  await browser.permissions.remove({ origins: [originPattern(origin)] });
}
