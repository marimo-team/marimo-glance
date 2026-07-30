import { createRuntime } from "@marimo/extension-runtime";
import { githubHost } from "@marimo/host-github";
import { gitlabHost } from "@marimo/host-gitlab";
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

export default defineContentScript({
  matches: PAGE_MATCHES,
  runAt: "document_idle",
  main(ctx) {
    const surface = supportedSite(new URL(location.href));
    if (!surface) return;

    // The ref tag is a published attribution string, disclosed in PRIVACY.md and
    // counted by the marimo team. Changing its spelling breaks that reporting.
    const runtime = createRuntime(HOSTS[surface], {
      ref: `marimo-glance:${surface}`,
    });
    runtime.start();
    ctx.onInvalidated(() => runtime.stop());
  },
});
