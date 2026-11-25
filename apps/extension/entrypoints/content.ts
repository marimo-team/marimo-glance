import { createLinkOut, createRuntime } from "@marimo/extension-runtime";
import { PAGE_MATCHES } from "../hosts";
import { linkOutDismissals } from "../link-out-dismissals";
import { resolvePage } from "../surfaces";

export default defineContentScript({
  matches: PAGE_MATCHES,
  runAt: "document_idle",
  async main(ctx) {
    const page = await resolvePage(new URL(location.href)).catch((error: unknown) => {
      console.error("[marimo-glance] failed to resolve site surface", error);
      return null;
    });
    // The storage read is async, so the page may have been torn down or the
    // extension reloaded while it was in flight.
    if (!page || ctx.isInvalid) return;

    const { host, link } = page.config;
    const controllers = [
      // The ref tag is a published attribution string, disclosed in PRIVACY.md and
      // counted by the marimo team. Changing its spelling breaks that reporting.
      host && createRuntime(host, { ref: `marimo-glance:${page.surface}` }),
      link && createLinkOut(link, { dismissals: linkOutDismissals }),
    ].filter((controller) => controller !== undefined);

    for (const controller of controllers) controller.start();
    ctx.onInvalidated(() => {
      for (const controller of controllers) controller.stop();
    });
  },
});
