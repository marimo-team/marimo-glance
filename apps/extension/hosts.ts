/** Sites that run from install, mapped to the surface name used in provenance refs. */
export const BUILT_IN_SITES = {
  "github.com": "github",
  "gist.github.com": "gist",
  "gitlab.com": "gitlab",
} as const;

/**
 * Known sites the user turns on from the popup. Kept out of the install-time
 * permissions: a new one would make the browser disable the extension on update
 * until the user re-approves.
 */
export const OPT_IN_SITES = {
  "colab.research.google.com": "colab",
} as const;

export type BuiltInSurface = (typeof BUILT_IN_SITES)[keyof typeof BUILT_IN_SITES];
export type OptInSurface = (typeof OPT_IN_SITES)[keyof typeof OPT_IN_SITES];
export type Surface = BuiltInSurface | OptInSurface;

export const PAGE_MATCHES = Object.keys(BUILT_IN_SITES).map((hostname) => `*://${hostname}/*`);

/** Where github.com redirects `/raw/`. gitlab.com serves raw source same-origin. */
const RAW_MATCHES = ["*://raw.githubusercontent.com/*", "*://gist.githubusercontent.com/*"];

export const HOST_PERMISSIONS = [...PAGE_MATCHES, ...RAW_MATCHES];

export const OPT_IN_ORIGINS = Object.keys(OPT_IN_SITES).map((hostname) => `https://${hostname}`);

export function builtInSite(url: URL): BuiltInSurface | null {
  return BUILT_IN_SITES[url.hostname as keyof typeof BUILT_IN_SITES] ?? null;
}

export function optInSite(url: URL): OptInSurface | null {
  return OPT_IN_SITES[url.hostname as keyof typeof OPT_IN_SITES] ?? null;
}

/** Whether an origin is a site named above, and so never a self-hosted instance. */
export function isKnownOrigin(origin: string): boolean {
  const url = new URL(origin);
  return builtInSite(url) !== null || optInSite(url) !== null;
}
