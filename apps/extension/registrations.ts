import { browser } from "wxt/browser";
import { isBuiltInOrigin, originPattern, readEnabledHosts } from "./enabled-hosts";

const CONTENT_SCRIPT = "/content-scripts/content.js";
const ID_PREFIX = "enabled:";

/**
 * Firefox MV2 registration handles, which live only for this background
 * session. They are tracked here so a re-sync can drop them before registering
 * again; Chrome MV3 has `getRegisteredContentScripts` and needs no bookkeeping.
 */
const sessionHandles: { unregister(): void }[] = [];

/**
 * Register the content script for every enabled origin, replacing whatever was
 * registered before.
 *
 * Registrations are not persisted across browser sessions even on Chrome, where
 * they could be: the background script re-syncs at startup anyway, and letting
 * the browser remember them would leave a live registration for an origin whose
 * permission was revoked while the extension was not running.
 */
export async function syncRegistrations(): Promise<void> {
  // A built-in origin is already covered by the static `matches`, so registering
  // it again would inject the script twice and start two runtimes on one page.
  // The popup will not offer to enable one, but a stale storage entry from an
  // earlier version must not be able to cause it either.
  const origins = Object.keys(await readEnabledHosts()).filter(
    (origin) => !isBuiltInOrigin(origin),
  );
  const patterns = origins.map(originPattern);

  if (browser.scripting?.registerContentScripts) {
    const registered = await browser.scripting.getRegisteredContentScripts();
    const ids = registered
      .filter((script) => script.id.startsWith(ID_PREFIX))
      .map((script) => script.id);
    if (ids.length > 0) {
      await browser.scripting.unregisterContentScripts({ ids });
    }
    if (patterns.length > 0) {
      await browser.scripting.registerContentScripts(
        patterns.map((pattern) => ({
          id: `${ID_PREFIX}${pattern}`,
          matches: [pattern],
          js: [CONTENT_SCRIPT],
          runAt: "document_idle" as const,
          persistAcrossSessions: false,
        })),
      );
    }
    return;
  }

  for (const handle of sessionHandles) {
    handle.unregister();
  }
  sessionHandles.length = 0;
  for (const pattern of patterns) {
    // MV2-only API: browser.contentScripts.register
    sessionHandles.push(
      await (browser as any).contentScripts.register({
        matches: [pattern],
        js: [{ file: CONTENT_SCRIPT }],
        runAt: "document_idle",
      }),
    );
  }
}

/**
 * Run the content script in a tab that is already open. A fresh grant does not
 * retroactively inject anything, and reloading would cost the user their page
 * state, so the script is injected directly instead.
 */
export async function injectContentScript(tabId: number): Promise<void> {
  if (browser.scripting?.executeScript) {
    await browser.scripting.executeScript({
      target: { tabId },
      files: [CONTENT_SCRIPT],
    });
    return;
  }
  // MV2-only API: browser.tabs.executeScript
  await (browser as any).tabs.executeScript(tabId, { file: CONTENT_SCRIPT });
}
