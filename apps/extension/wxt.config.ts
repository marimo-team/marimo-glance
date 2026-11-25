import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";
import { HOST_PERMISSIONS } from "./hosts";

// See https://wxt.dev/api/config.html
export default defineConfig({
  outDir: "output",
  modules: ["@wxt-dev/module-react"],
  vite: () => ({ plugins: [tailwindcss()] }),
  // The Firefox sources ZIP needs the whole monorepo so a reviewer can rebuild
  // from the sibling `@marimo/*` packages.
  zip: {
    name: "marimo-glance",
    sourcesRoot: "../..",
    excludeSources: ["**/dist/**", "**/output/**", "**/.wxt/**", "**/.turbo/**"],
  },
  manifest: ({ browser }) => ({
    name: "marimo Glance",
    description:
      "See marimo notebooks at a glance: run them live on GitHub, gists and GitLab, or open Jupyter notebooks in molab.",
    host_permissions: HOST_PERMISSIONS,
    // None of these adds an install-time warning. `activeTab` lets the popup read
    // the tab URL before a site is enabled; `scripting` is MV3-only (Firefox MV2
    // injects through `contentScripts`).
    permissions:
      browser === "firefox" ? ["storage", "activeTab"] : ["storage", "activeTab", "scripting"],
    // Granted one origin at a time from the popup, never at install.
    ...(browser === "firefox"
      ? { optional_permissions: ["*://*/*"] }
      : { optional_host_permissions: ["*://*/*"] }),
    // The extension sends nothing itself: the notebook rides in the playground
    // URL fragment, and "Open in molab" is a link the user follows.
    ...(browser === "firefox" && {
      browser_specific_settings: {
        gecko: {
          id: "marimo-glance@marimo.io",
          data_collection_permissions: { required: ["none"] },
        },
      },
    }),
  }),
});
