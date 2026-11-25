import { browser } from "wxt/browser";
import { forgetEnabledHostsFor, watchEnabledHosts } from "@/enabled-hosts";
import { syncRegistrations } from "@/registrations";

/**
 * Keeps content-script registrations a function of two inputs, the granted
 * permissions and the stored instances, by re-syncing whenever either changes.
 * The popup only writes those inputs: the browser's permission prompt can close
 * it, and either may land first.
 */
export default defineBackground(() => {
  const sync = () => {
    syncRegistrations().catch((error: unknown) => {
      console.error("[marimo-glance] failed to sync content-script registrations", error);
    });
  };

  // Registrations do not survive a browser restart, and an MV3 worker only
  // starts for an event it listens to.
  browser.runtime.onStartup.addListener(sync);
  browser.runtime.onInstalled.addListener(sync);
  browser.permissions.onAdded.addListener(sync);
  // Also covers a permission revoked from browser settings.
  browser.permissions.onRemoved.addListener(({ origins = [] }) => {
    forgetEnabledHostsFor(origins).finally(sync);
  });
  // Re-enabling an origin that is already granted fires no permission event.
  watchEnabledHosts(sync);
});
