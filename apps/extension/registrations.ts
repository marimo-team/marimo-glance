import { browser } from "wxt/browser";
import { originPattern, readEnabledOrigins } from "./enabled-hosts";

const CONTENT_SCRIPT = "/content-scripts/content.js";
const ID_PREFIX = "enabled:";

/** Firefox MV2 has no way to list registrations, so they are tracked here. */
const sessionHandles = new Map<string, { unregister(): void }>();

// Syncs run one at a time: concurrent ones would race on registration ids.
let queue: Promise<void> = Promise.resolve();

/**
 * Register the content script for exactly the enabled origins, and start it in
 * open tabs of newly registered ones: a fresh grant does not inject, and
 * reloading would cost the user their page. Unchanged registrations are left
 * alone, so a page loading mid-sync still gets the script.
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
  const wanted = [...Object.keys(selfHosted), ...optIn].map(originPattern);
  const registered = await registeredPatterns();
  const added = wanted.filter((pattern) => !registered.includes(pattern));
  const removed = registered.filter((pattern) => !wanted.includes(pattern));

  await unregister(removed);
  await register(added);
  if (added.length > 0) await injectIntoOpenTabs(added);
}

const usesScripting = () => Boolean(browser.scripting?.registerContentScripts);

async function registeredPatterns(): Promise<string[]> {
  if (!usesScripting()) return [...sessionHandles.keys()];
  return (await browser.scripting.getRegisteredContentScripts())
    .map((script) => script.id)
    .filter((id) => id.startsWith(ID_PREFIX))
    .map((id) => id.slice(ID_PREFIX.length));
}

async function unregister(patterns: string[]): Promise<void> {
  if (patterns.length === 0) return;
  if (usesScripting()) {
    await browser.scripting.unregisterContentScripts({
      ids: patterns.map((pattern) => `${ID_PREFIX}${pattern}`),
    });
    return;
  }
  for (const pattern of patterns) {
    sessionHandles.get(pattern)?.unregister();
    sessionHandles.delete(pattern);
  }
}

async function register(patterns: string[]): Promise<void> {
  if (patterns.length === 0) return;
  if (usesScripting()) {
    await browser.scripting.registerContentScripts(
      patterns.map((pattern) => ({
        id: `${ID_PREFIX}${pattern}`,
        matches: [pattern],
        js: [CONTENT_SCRIPT],
        runAt: "document_idle" as const,
        persistAcrossSessions: false,
      })),
    );
    return;
  }
  for (const pattern of patterns) {
    // MV2-only API: browser.contentScripts.register
    const handle = await (browser as any).contentScripts.register({
      matches: [pattern],
      js: [{ file: CONTENT_SCRIPT }],
      runAt: "document_idle",
    });
    sessionHandles.set(pattern, handle);
  }
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
