import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
	outDir: "output",
	manifest: {
		name: "marimo live",
		description:
			"Render marimo notebooks inline on GitHub and gists instead of raw Python source.",
		host_permissions: [
			"*://github.com/*",
			"*://gist.github.com/*",
			"*://raw.githubusercontent.com/*",
			"*://gist.githubusercontent.com/*",
		],
	},
});
