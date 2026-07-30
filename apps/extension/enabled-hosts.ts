import { browser } from "wxt/browser";
import { SUPPORTED_SITES, type Surface } from "./hosts";

const STORAGE_KEY = "enabledHosts";

/**
 * The platforms a user can declare a self-hosted instance to be. Derived from
 * `Surface` so the content script's existing host table serves both built-in
 * surfaces and user-enabled origins with no second mapping. Gists are absent
 * because a gist surface is not something an instance can be.
 */
export type Flavor = Extract<Surface, "github" | "gitlab">;

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

/**
 * Enabled hosts whose permission is still granted, pruning any that are not.
 *
 * The permission is the trust and storage only carries the flavor, so a user who
 * revokes access in browser settings must not keep a working entry here. The
 * pruned map is written back so the two stores converge instead of drifting.
 */
export async function readEnabledHosts(): Promise<EnabledHosts> {
  const stored = await readStored();
  const { origins } = await browser.permissions.getAll();
  const granted = new Set(origins ?? []);

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

/**
 * Whether an origin is already covered by the static content-script matches.
 * Enabling one of these would register a second overlapping content script and
 * start two runtimes on the same page.
 */
export function isBuiltInOrigin(origin: string): boolean {
  return new URL(origin).hostname in SUPPORTED_SITES;
}
