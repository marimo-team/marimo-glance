import { browser } from "wxt/browser";
import { syncRegistrations } from "@/registrations";

/**
 * Keeps content-script registrations in step with the origins the user has
 * enabled.
 *
 * This runs at startup rather than only when a host is enabled because Firefox
 * MV2 registrations last only for the browser session, so without a startup
 * re-sync an enabled host would quietly stop working after a restart.
 */
export default defineBackground(() => {
  function syncSafely(): void {
    syncRegistrations().catch((error: unknown) => {
      console.error("[marimo-glance] failed to sync content-script registrations", error);
    });
  }

  syncSafely();

  browser.runtime.onInstalled.addListener(() => {
    syncSafely();
  });

  // Covers a permission revoked from browser settings, where the extension gets
  // no other signal that an enabled host is no longer allowed.
  browser.permissions.onRemoved.addListener(() => {
    syncSafely();
  });
});
