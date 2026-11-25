import { browser } from "wxt/browser";
import { originPattern, readEnabledOrigins } from "./enabled-hosts";

const CONTENT_SCRIPT = "/content-scripts/content.js";
const ID_PREFIX = "enabled:";

/** Firefox MV2 has no way to list registrations, so they are tracked here. */
const sessionHandles = new Map<string, { unregister(): void }>();

// Syncs run one at a time: concurrent ones would race on registration ids.
let queue: Promise<void> = Promise.resolve();

/**
 * Register the content script for every enabled origin, replacing what was
 * registered before, and start it in open tabs of newly registered origins: a
 * fresh grant does not inject, and reloading would cost the user their page.
 *
 * Never persisted across sessions: a persisted registration would outlive a
 * permission revoked while the extension was not running.
 */
export function syncRegistrations(): Promise<void> {
  const run = queue.then(sync);
  queue = run.catch(() => {});
  return run;
}

async function sync(): Promise<void> {
  const { selfHosted, optIn } = await readEnabledOrigins();
  const patterns = [...Object.keys(selfHosted), ...optIn].map(originPattern);
  const previous = await replaceRegistrations(patterns);
  const added = patterns.filter((pattern) => !previous.includes(pattern));
  if (added.length > 0) await injectIntoOpenTabs(added);
}

/** Register exactly `patterns`, returning the patterns that were registered before. */
async function replaceRegistrations(patterns: string[]): Promise<string[]> {
  if (browser.scripting?.registerContentScripts) {
    const ids = (await browser.scripting.getRegisteredContentScripts())
      .map((script) => script.id)
      .filter((id) => id.startsWith(ID_PREFIX));
    if (ids.length > 0) await browser.scripting.unregisterContentScripts({ ids });
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
    return ids.map((id) => id.slice(ID_PREFIX.length));
  }

  const previous = [...sessionHandles.keys()];
  for (const handle of sessionHandles.values()) handle.unregister();
  sessionHandles.clear();
  for (const pattern of patterns) {
    // MV2-only API: browser.contentScripts.register
    const handle = await (browser as any).contentScripts.register({
      matches: [pattern],
      js: [{ file: CONTENT_SCRIPT }],
      runAt: "document_idle",
    });
    sessionHandles.set(pattern, handle);
  }
  return previous;
}

async function injectIntoOpenTabs(patterns: string[]): Promise<void> {
  const tabs = await browser.tabs.query({ url: patterns });
  await Promise.allSettled(tabs.flatMap((tab) => (tab.id === undefined ? [] : [inject(tab.id)])));
}

async function inject(tabId: number): Promise<void> {
  if (browser.scripting?.executeScript) {
    await browser.scripting.executeScript({ target: { tabId }, files: [CONTENT_SCRIPT] });
    return;
  }
  // MV2-only API: browser.tabs.executeScript
  await (browser as any).tabs.executeScript(tabId, { file: CONTENT_SCRIPT });
}
