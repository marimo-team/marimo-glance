import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
	outDir: "output",
	manifest: {
		name: "Marimo Glance",
		description:
			"See marimo notebooks at a glance: run them live, inline on GitHub and gists.",
		host_permissions: [
			"*://github.com/*",
			"*://gist.github.com/*",
			"*://raw.githubusercontent.com/*",
			"*://gist.githubusercontent.com/*",
			"*://gitlab.com/*",
		],
	},
});
