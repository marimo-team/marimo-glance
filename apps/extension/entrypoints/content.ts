import { createRuntime } from "@marimo/extension-runtime";
import { githubHost } from "@marimo/host-github";
import { gitlabHost } from "@marimo/host-gitlab";

// github.com, gist.github.com, and gitlab.com are separate origins, so a page
// load never crosses between them — the host and its ref surface are fixed for
// this instance's lifetime. github.com and gist.github.com share one host but
// send distinct ref tags.
const REGISTRY = {
	"github.com": { host: githubHost, surface: "github" },
	"gist.github.com": { host: githubHost, surface: "gist" },
	"gitlab.com": { host: gitlabHost, surface: "gitlab" },
} as const;

export default defineContentScript({
	matches: ["*://github.com/*", "*://gist.github.com/*", "*://gitlab.com/*"],
	runAt: "document_idle",
	main(ctx) {
		const entry = REGISTRY[location.hostname as keyof typeof REGISTRY];
		if (!entry) return;
		const runtime = createRuntime(entry.host, {
			ref: `marimo-glance:${entry.surface}`,
		});
		runtime.start();
		ctx.onInvalidated(() => runtime.stop());
	},
});
