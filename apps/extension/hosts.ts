/**
 * The sites marimo Glance runs on from install, each mapped to the surface name
 * that identifies it in playground provenance refs. github.com and
 * gist.github.com are separate origins served by one host implementation, so
 * they are separate entries with distinct surfaces.
 */
export const BUILT_IN_SITES = {
  "github.com": "github",
  "gist.github.com": "gist",
  "gitlab.com": "gitlab",
} as const;

/**
 * Known sites the user turns on from the popup. Keeping them out of the
 * install-time permissions means adding one never makes the browser disable the
 * extension on update until the user approves the new access.
 */
export const OPT_IN_SITES = {
  "colab.research.google.com": "colab",
} as const;

export type BuiltInSurface = (typeof BUILT_IN_SITES)[keyof typeof BUILT_IN_SITES];
export type OptInSurface = (typeof OPT_IN_SITES)[keyof typeof OPT_IN_SITES];
export type Surface = BuiltInSurface | OptInSurface;

export const PAGE_MATCHES = Object.keys(BUILT_IN_SITES).map((hostname) => `*://${hostname}/*`);

/**
 * Extra origins fetched for raw blob source. github.com redirects `/raw/` to
 * these; gitlab.com serves `/-/raw/` same-origin, so it needs no extra host.
 */
const RAW_MATCHES = ["*://raw.githubusercontent.com/*", "*://gist.githubusercontent.com/*"];

export const HOST_PERMISSIONS = [...PAGE_MATCHES, ...RAW_MATCHES];

export const OPT_IN_ORIGINS = Object.keys(OPT_IN_SITES).map((hostname) => `https://${hostname}`);

export function builtInSite(url: URL): BuiltInSurface | null {
  return BUILT_IN_SITES[url.hostname as keyof typeof BUILT_IN_SITES] ?? null;
}

export function optInSite(url: URL): OptInSurface | null {
  return OPT_IN_SITES[url.hostname as keyof typeof OPT_IN_SITES] ?? null;
}

/**
 * Whether an origin belongs to a site this file names. Such an origin must
 * never be enabled as a self-hosted instance: a built-in one would be injected
 * twice, and an opt-in one already has its own surface.
 */
export function isKnownOrigin(origin: string): boolean {
  const url = new URL(origin);
  return builtInSite(url) !== null || optInSite(url) !== null;
}
