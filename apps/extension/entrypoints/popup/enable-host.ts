import { browser } from "wxt/browser";
import { type Flavor, originPattern, sendEnabledHostChange } from "@/enabled-hosts";

// These only write the inputs the background script registers from, the
// permission and the stored platform, because the permission prompt can close
// the popup. Each starts its work before any `await`: Firefox only honours a
// permission request made directly in the click handler.

function requestOrigin(origin: string): Promise<boolean> {
  return browser.permissions.request({ origins: [originPattern(origin)] });
}

export async function enableKnownSite(origin: string): Promise<void> {
  await requestOrigin(origin);
}

export async function enableSelfHosted(origin: string, flavor: Flavor): Promise<void> {
  const granted = requestOrigin(origin);
  void sendEnabledHostChange({ type: "save-enabled-host", origin, flavor });
  if (!(await granted)) await sendEnabledHostChange({ type: "forget-enabled-host", origin });
}

export async function disableOrigin(origin: string): Promise<void> {
  await sendEnabledHostChange({ type: "forget-enabled-host", origin });
  await browser.permissions.remove({ origins: [originPattern(origin)] });
}
