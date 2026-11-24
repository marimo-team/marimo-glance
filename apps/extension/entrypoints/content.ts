import { createLinkOut, createRuntime } from "@marimo/extension-runtime";
import { colabNotebookLink } from "@marimo/host-colab";
import { githubHost, githubNotebookLink } from "@marimo/host-github";
import { gitlabHost } from "@marimo/host-gitlab";
import type { Host, NotebookLink } from "@marimo/notebook-core";
import { storedFlavor } from "../enabled-hosts";
import { PAGE_MATCHES, supportedSite, type Surface } from "../hosts";
import { linkOutDismissals } from "../link-out-dismissals";

interface SurfaceConfig {
  /** Renders marimo notebooks in place of the page's source. */
  host?: Host;
  /** Offers Jupyter notebooks on the page as a way out to molab. */
  link?: NotebookLink;
}

// github.com, gist.github.com, gitlab.com, and colab.research.google.com are
// separate origins, so a page load never crosses between them — the surface is
// fixed for this instance's lifetime. github.com and gist.github.com share one
// host but send distinct ref tags.
//
// The `Record<Surface, ...>` type makes a surface with no entry a type error, so
// adding a site to SUPPORTED_SITES cannot leave it silently unhandled here.
const SURFACES: Record<Surface, SurfaceConfig> = {
  github: { host: githubHost, link: githubNotebookLink },
  gist: { host: githubHost },
  gitlab: { host: gitlabHost },
  colab: { link: colabNotebookLink },
};

/**
 * The surface for this page: a built-in site, or the flavor the user declared
 * when enabling this origin. The store is consulted only as a fallback so a
 * built-in site never pays for a storage read.
 */
async function resolveSurface(url: URL): Promise<Surface | null> {
  const builtIn = supportedSite(url);
  if (builtIn) return builtIn;

  return storedFlavor(url.origin);
}

export default defineContentScript({
  matches: PAGE_MATCHES,
  runAt: "document_idle",
  async main(ctx) {
    const surface = await resolveSurface(new URL(location.href)).catch((error: unknown) => {
      console.error("[marimo-glance] failed to resolve site surface", error);
      return null;
    });
    if (!surface) return;

    // The storage read is async, so the page may have been torn down or the
    // extension reloaded while it was in flight.
    if (ctx.isInvalid) return;

    const { host, link } = SURFACES[surface];

    // The ref tag is a published attribution string, disclosed in PRIVACY.md and
    // counted by the marimo team. Changing its spelling breaks that reporting.
    const runtimes = [
      host && createRuntime(host, { ref: `marimo-glance:${surface}` }),
      link && createLinkOut(link, { dismissals: linkOutDismissals }),
    ].filter((runtime) => runtime !== undefined);

    for (const runtime of runtimes) runtime.start();
    ctx.onInvalidated(() => {
      for (const runtime of runtimes) runtime.stop();
    });
  },
});
