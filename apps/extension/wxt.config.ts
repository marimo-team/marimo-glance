import { defineConfig } from "wxt";
import { HOST_PERMISSIONS } from "./hosts";

// See https://wxt.dev/api/config.html
export default defineConfig({
	outDir: "output",
	manifest: ({ browser }) => ({
		name: "Marimo Glance",
		description:
			"See marimo notebooks at a glance: run them live, inline on GitHub and gists.",
		host_permissions: HOST_PERMISSIONS,
		// AMO requires new extensions to declare data collection. Nothing leaves
		// the browser to a server: the notebook and its ref ride in the playground
		// URL fragment (never sent in HTTP requests) and the iframe referrer is
		// stripped, so the honest declaration is "none".
		...(browser === "firefox" && {
			browser_specific_settings: {
				gecko: {
					data_collection_permissions: { required: ["none"] },
				},
			},
		}),
	}),
});
