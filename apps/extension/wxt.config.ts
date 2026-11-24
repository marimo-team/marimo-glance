import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";
import { HOST_PERMISSIONS } from "./hosts";

// See https://wxt.dev/api/config.html
export default defineConfig({
  outDir: "output",
  modules: ["@wxt-dev/module-react"],
  vite: () => ({ plugins: [tailwindcss()] }),
  // The extension depends on the sibling `@marimo/*` workspace packages, so the
  // Firefox sources ZIP must contain the whole monorepo for a reviewer to run
  // `pnpm install` and reproduce the build. Zip from the repo root and drop
  // only generated artifacts (node_modules and dotfiles are excluded by default).
  zip: {
    // Without this the archives are named after the package (`@marimo/extension`
    // kebab-cased to `marimoextension`). Store reviewers download these by name.
    name: "marimo-glance",
    sourcesRoot: "../..",
    excludeSources: ["**/dist/**", "**/output/**", "**/.wxt/**", "**/.turbo/**"],
  },
  manifest: ({ browser }) => ({
    name: "marimo Glance",
    description:
      "See marimo notebooks at a glance: run them live on GitHub, gists and GitLab, or open Jupyter notebooks in molab.",
    host_permissions: HOST_PERMISSIONS,
    // `storage` holds the origin→flavor map for user-enabled hosts and the molab
    // pill's dismissals. `activeTab` lets the popup read the URL of the tab it
    // opened on, so it can offer to enable a site it has no access to yet.
    // `scripting` registers and injects the content script on enabled origins,
    // and exists only on MV3; Firefox MV2 uses `contentScripts` and
    // `tabs.executeScript`, which need no extra permission beyond the host
    // grant itself. None of these adds an install-time warning.
    permissions:
      browser === "firefox" ? ["storage", "activeTab"] : ["storage", "activeTab", "scripting"],
    // Requested one origin at a time from the popup (a self-hosted instance, or
    // an opt-in site like Colab), never at install time, so the install prompt
    // is unchanged. `<all_urls>` here only sets the ceiling of what the user may
    // later grant.
    ...(browser === "firefox"
      ? { optional_permissions: ["*://*/*"] }
      : { optional_host_permissions: ["*://*/*"] }),
    // AMO requires new extensions to declare data collection. The extension
    // sends nothing itself: the notebook and its ref ride in the playground URL
    // fragment (never sent in HTTP requests) and the iframe referrer is
    // stripped. "Open in molab" is a link the user follows, carrying only the
    // public notebook URL already shown on the page, so the declaration stays
    // "none".
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
