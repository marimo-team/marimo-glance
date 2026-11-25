import { browser } from "wxt/browser";
import { applyEnabledHostChanges, forgetEnabledHostsFor, watchEnabledHosts } from "@/enabled-hosts";
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

  // Registrations last one session, and the background restarts without an
  // event of its own, e.g. when the extension is turned off and on again.
  sync();
  // An MV3 worker only starts for an event it listens to.
  browser.runtime.onStartup.addListener(sync);
  browser.runtime.onInstalled.addListener(sync);
  browser.permissions.onAdded.addListener(sync);
  // Also covers a permission revoked from browser settings.
  browser.permissions.onRemoved.addListener(({ origins = [] }) => {
    forgetEnabledHostsFor(origins)
      .catch((error: unknown) => {
        console.error("[marimo-glance] failed to forget revoked instances", error);
      })
      .finally(sync);
  });
  applyEnabledHostChanges();
  // Re-enabling an origin that is already granted fires no permission event.
  watchEnabledHosts(sync);
});
