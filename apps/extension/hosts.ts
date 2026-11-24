/**
 * The sites marimo Glance runs on, each mapped to the surface name that
 * identifies it in playground provenance refs (Colab has no playground, so its
 * surface only selects what the content script mounts). github.com and gist.github.com
 * are separate origins served by one host implementation, so they are separate
 * entries with distinct surfaces.
 */
export const SUPPORTED_SITES = {
  "github.com": "github",
  "gist.github.com": "gist",
  "gitlab.com": "gitlab",
  "colab.research.google.com": "colab",
} as const;

export type Surface = (typeof SUPPORTED_SITES)[keyof typeof SUPPORTED_SITES];

/**
 * What the extension does on each built-in surface, for the popup's summary.
 * `marimo` runs `.py` notebooks in the page; `jupyter` offers `.ipynb` to molab.
 */
export interface SurfaceCapabilities {
  marimo: boolean;
  jupyter: boolean;
}

export const SURFACE_CAPABILITIES: Record<Surface, SurfaceCapabilities> = {
  github: { marimo: true, jupyter: true },
  gist: { marimo: true, jupyter: false },
  gitlab: { marimo: true, jupyter: false },
  colab: { marimo: false, jupyter: true },
};

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
