import { colabNotebookLink } from "@marimo/host-colab";
import { githubHost, githubNotebookLink } from "@marimo/host-github";
import { gitlabHost } from "@marimo/host-gitlab";
import type { Host, NotebookLink } from "@marimo/notebook-core";
import { type Flavor, storedFlavor } from "./enabled-hosts";
import { builtInSite, optInSite, type Surface } from "./hosts";

/** What runs on a page: a host renders marimo notebooks, a link offers Jupyter ones to molab. */
export type SurfaceConfig =
  | { host: Host; link?: NotebookLink }
  | { host?: undefined; link: NotebookLink };

// Typed by `Surface`, so a site added to hosts.ts without an entry here is a
// type error rather than a page that silently does nothing.
const KNOWN_SURFACES: Record<Surface, SurfaceConfig> = {
  github: { host: githubHost, link: githubNotebookLink },
  gist: { host: githubHost },
  gitlab: { host: gitlabHost },
  colab: { link: colabNotebookLink },
};

// No links: molab cannot fetch from a self-hosted instance.
const SELF_HOSTED: Record<Flavor, SurfaceConfig> = {
  github: { host: githubHost },
  gitlab: { host: gitlabHost },
};

/**
 * What to run on this page, and the surface that names it in provenance refs.
 * Every origin is its own page load, so this is fixed for the script's
 * lifetime. The store is read only for self-hosted origins, so a known site
 * never pays for a storage read.
 */
export async function resolvePage(
  url: URL,
): Promise<{ surface: Surface; config: SurfaceConfig } | null> {
  const known = builtInSite(url) ?? optInSite(url);
  if (known) return { surface: known, config: KNOWN_SURFACES[known] };

  const flavor = await storedFlavor(url.origin);
  return flavor ? { surface: flavor, config: SELF_HOSTED[flavor] } : null;
}
