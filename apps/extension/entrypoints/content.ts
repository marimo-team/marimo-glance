import { createRuntime } from "@marimo/extension-runtime";
import { githubHost } from "@marimo/host-github";

export default defineContentScript({
	matches: ["*://github.com/*", "*://gist.github.com/*"],
	runAt: "document_idle",
	main(ctx) {
		// github.com and gist.github.com are separate origins, so a page load never
		// crosses between them — the surface is fixed for this instance's lifetime.
		const surface = location.hostname === "gist.github.com" ? "gist" : "github";
		const runtime = createRuntime(githubHost, { ref: `marimo-glance:${surface}` });
		runtime.start();
		ctx.onInvalidated(() => runtime.stop());
	},
});
