/**
 * The sites marimo Glance runs on, each mapped to the surface name that
 * identifies it in playground provenance refs. github.com and gist.github.com
 * are separate origins served by one host implementation, so they are separate
 * entries with distinct surfaces.
 */
export const SUPPORTED_SITES = {
  "github.com": "github",
  "gist.github.com": "gist",
  "gitlab.com": "gitlab",
} as const;

export type Surface = (typeof SUPPORTED_SITES)[keyof typeof SUPPORTED_SITES];

export const PAGE_MATCHES = Object.keys(SUPPORTED_SITES).map((hostname) => `*://${hostname}/*`);

/**
 * Extra origins fetched for raw blob source. github.com redirects `/raw/` to
 * these; gitlab.com serves `/-/raw/` same-origin, so it needs no extra host.
 */
const RAW_MATCHES = ["*://raw.githubusercontent.com/*", "*://gist.githubusercontent.com/*"];

export const HOST_PERMISSIONS = [...PAGE_MATCHES, ...RAW_MATCHES];

/** The surface for a URL's site, or null where the extension does not run. */
export function supportedSite(url: URL): Surface | null {
  return SUPPORTED_SITES[url.hostname as keyof typeof SUPPORTED_SITES] ?? null;
}
