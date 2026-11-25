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

export async function saveEnabledHost(origin: string, flavor: Flavor): Promise<void> {
  const stored = await readStored();
  await browser.storage.local.set({
    [STORAGE_KEY]: { ...stored, [origin]: flavor },
  });
}

export async function forgetEnabledHost(origin: string): Promise<void> {
  await forgetEnabledHostsFor([originPattern(origin)]);
}

/** Forget the instances behind these match patterns, e.g. ones whose permission was revoked. */
export async function forgetEnabledHostsFor(patterns: string[]): Promise<void> {
  const stored = await readStored();
  const kept = Object.fromEntries(
    Object.entries(stored).filter(([origin]) => !patterns.includes(originPattern(origin))),
  );
  if (Object.keys(kept).length !== Object.keys(stored).length) {
    await browser.storage.local.set({ [STORAGE_KEY]: kept });
  }
}
