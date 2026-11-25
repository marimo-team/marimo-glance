import { browser } from "wxt/browser";
import { type BuiltInSurface, isKnownOrigin, OPT_IN_ORIGINS } from "./hosts";

const STORAGE_KEY = "enabledHosts";

/** The platforms a self-hosted instance can be, named after the surface whose host serves it. */
export type Flavor = Extract<BuiltInSurface, "github" | "gitlab">;

export const FLAVORS: readonly Flavor[] = ["github", "gitlab"];

export const FLAVOR_LABELS: Record<Flavor, string> = {
  github: "GitHub",
  gitlab: "GitLab",
};

type EnabledHosts = Record<string, Flavor>;

/** The match pattern for an origin, for both permissions and registration. */
export function originPattern(origin: string): string {
  return `${origin}/*`;
}

async function readStored(): Promise<EnabledHosts> {
  const stored = await browser.storage.local.get(STORAGE_KEY);
  return (stored[STORAGE_KEY] as EnabledHosts | undefined) ?? {};
}

async function isGranted(origin: string): Promise<boolean> {
  return browser.permissions.contains({ origins: [originPattern(origin)] });
}

/**
 * The origins enabled beyond the built-in sites: self-hosted instances with
 * their flavor, and opt-in sites. The permission is the trust, so a stored
 * entry without one is ignored. A known origin is never self-hosted: a second
 * registration would start two runtimes on one page.
 *
 * Read-only on purpose: an entry may be waiting on the permission prompt.
 */
export async function readEnabledOrigins(): Promise<{
  selfHosted: EnabledHosts;
  optIn: string[];
}> {
  const stored = await readStored();
  const candidates = [
    ...Object.keys(stored).filter((origin) => !isKnownOrigin(origin)),
    ...OPT_IN_ORIGINS,
  ];
  const grants = await Promise.all(candidates.map(isGranted));
  const granted = new Set(candidates.filter((_, index) => grants[index]));

  const selfHosted: EnabledHosts = {};
  for (const [origin, flavor] of Object.entries(stored)) {
    if (granted.has(origin) && !isKnownOrigin(origin)) selfHosted[origin] = flavor;
  }
  return { selfHosted, optIn: OPT_IN_ORIGINS.filter((origin) => granted.has(origin)) };
}

/** Report changes to the stored instances, from any extension context. */
export function watchEnabledHosts(onChange: () => void): void {
  browser.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && STORAGE_KEY in changes) onChange();
  });
}

/**
 * The flavor stored for an origin. Skips the permission check because content
 * scripts cannot call the permissions API, and running there implies the grant.
 */
export async function storedFlavor(origin: string): Promise<Flavor | null> {
  const stored = await readStored();
  return stored[origin] ?? null;
}

/** A change to the stored instances, sent from the popup for the background script to apply. */
export type EnabledHostChange =
  | { type: "save-enabled-host"; origin: string; flavor: Flavor }
  | { type: "forget-enabled-host"; origin: string };

function isEnabledHostChange(message: unknown): message is EnabledHostChange {
  if (typeof message !== "object" || message === null) return false;
  const { type, origin, flavor } = message as Record<string, unknown>;
  if (typeof origin !== "string") return false;
  if (type === "forget-enabled-host") return true;
  return type === "save-enabled-host" && FLAVORS.includes(flavor as Flavor);
}

/**
 * Ask the background script to apply a change. Sent rather than written here
 * because the permission prompt can close the popup between a read and its
 * write, and so the background script is the only writer.
 */
export async function sendEnabledHostChange(change: EnabledHostChange): Promise<void> {
  try {
    await browser.runtime.sendMessage(change);
  } catch (error) {
    console.error("[marimo-glance] failed to send an enabled-host change", error);
  }
}

/** Apply the popup's changes, in the order they were sent. */
export function applyEnabledHostChanges(): void {
  browser.runtime.onMessage.addListener((message: unknown) => {
    if (!isEnabledHostChange(message)) return undefined;
    const write =
      message.type === "save-enabled-host"
        ? saveEnabledHost(message.origin, message.flavor)
        : forgetEnabledHostsFor([originPattern(message.origin)]);
    return write.catch((error: unknown) => {
      console.error("[marimo-glance] failed to apply an enabled-host change", error);
    });
  });
}

// Writes read the stored map first, so they run one at a time.
let writes: Promise<void> = Promise.resolve();

/** Apply `change`, which returns its input untouched when there is nothing to write. */
function updateStored(change: (hosts: EnabledHosts) => EnabledHosts): Promise<void> {
  const run = writes.then(async () => {
    const stored = await readStored();
    const next = change(stored);
    if (next !== stored) await browser.storage.local.set({ [STORAGE_KEY]: next });
  });
  writes = run.catch(() => {});
  return run;
}

function saveEnabledHost(origin: string, flavor: Flavor): Promise<void> {
  return updateStored((hosts) => ({ ...hosts, [origin]: flavor }));
}

/** Forget the instances behind these match patterns, e.g. ones whose permission was revoked. */
export function forgetEnabledHostsFor(patterns: string[]): Promise<void> {
  return updateStored((hosts) => {
    const kept = Object.entries(hosts).filter(
      ([origin]) => !patterns.includes(originPattern(origin)),
    );
    return kept.length === Object.keys(hosts).length ? hosts : Object.fromEntries(kept);
  });
}
