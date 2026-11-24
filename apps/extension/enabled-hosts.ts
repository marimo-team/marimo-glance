import { browser } from "wxt/browser";
import { type BuiltInSurface, OPT_IN_ORIGINS } from "./hosts";

const STORAGE_KEY = "enabledHosts";

/**
 * The platforms a user can declare a self-hosted instance to be, named after
 * the built-in surface whose host serves it. Gists are absent because a gist
 * surface is not something an instance can be.
 */
export type Flavor = Extract<BuiltInSurface, "github" | "gitlab">;

export const FLAVORS: readonly Flavor[] = ["github", "gitlab"];

export const FLAVOR_LABELS: Record<Flavor, string> = {
  github: "GitHub",
  gitlab: "GitLab",
};

type EnabledHosts = Record<string, Flavor>;

/** The match pattern for an origin, used for both permissions and registration. */
export function originPattern(origin: string): string {
  return `${origin}/*`;
}

async function readStored(): Promise<EnabledHosts> {
  const stored = await browser.storage.local.get(STORAGE_KEY);
  return (stored[STORAGE_KEY] as EnabledHosts | undefined) ?? {};
}

async function grantedPatterns(): Promise<Set<string>> {
  const { origins } = await browser.permissions.getAll();
  return new Set(origins ?? []);
}

/** The opt-in sites the user has turned on. The grant alone records it. */
export async function readEnabledOptInOrigins(): Promise<string[]> {
  const granted = await grantedPatterns();
  return OPT_IN_ORIGINS.filter((origin) => granted.has(originPattern(origin)));
}

/**
 * Enabled hosts whose permission is still granted, pruning any that are not.
 *
 * The permission is the trust and storage only carries the flavor, so a user who
 * revokes access in browser settings must not keep a working entry here. The
 * pruned map is written back so the two stores converge instead of drifting.
 */
export async function readEnabledHosts(): Promise<EnabledHosts> {
  const stored = await readStored();
  const granted = await grantedPatterns();

  const live: EnabledHosts = {};
  for (const [origin, flavor] of Object.entries(stored)) {
    if (granted.has(originPattern(origin))) {
      live[origin] = flavor;
    }
  }

  if (Object.keys(live).length !== Object.keys(stored).length) {
    await browser.storage.local.set({ [STORAGE_KEY]: live });
  }
  return live;
}

/**
 * The flavor stored for an origin, read without consulting the permissions API,
 * which browsers do not expose to content scripts.
 *
 * Skipping the permission check is safe here: a content script only runs on a
 * non-built-in origin because a registration created under a granted permission
 * injected it, so the grant is implied by execution.
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
  const stored = await readStored();
  delete stored[origin];
  await browser.storage.local.set({ [STORAGE_KEY]: stored });
}
