import { createRuntime } from "@marimo/extension-runtime";
import { githubHost } from "@marimo/host-github";
import { gitlabHost } from "@marimo/host-gitlab";
import { storedFlavor } from "../enabled-hosts";
import { PAGE_MATCHES, supportedSite, type Surface } from "../hosts";

// github.com, gist.github.com, and gitlab.com are separate origins, so a page
// load never crosses between them — the host is fixed for this instance's
// lifetime. github.com and gist.github.com share one host but send distinct
// ref tags.
//
// `satisfies` makes a surface with no host a type error, so adding a site to
// SUPPORTED_SITES cannot leave it silently unhandled here.
const HOSTS = {
  github: githubHost,
  gist: githubHost,
  gitlab: gitlabHost,
} satisfies Record<Surface, unknown>;

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

    // The ref tag is a published attribution string, disclosed in PRIVACY.md and
    // counted by the marimo team. Changing its spelling breaks that reporting.
    const runtime = createRuntime(HOSTS[surface], {
      ref: `marimo-glance:${surface}`,
    });
    runtime.start();
    ctx.onInvalidated(() => runtime.stop());
  },
});
