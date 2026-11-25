# @marimo/extension

The actual browser extension, built with [WXT](https://wxt.dev). There's barely any logic here on purpose: it wires each site's host or notebook link to the runtime and lets the packages do the real work.

## What's in here

- `hosts.ts` names the known sites: built-in ones (github.com, gist.github.com, gitlab.com) that run from install, and opt-in ones (Colab) the user enables from the popup.
- `entrypoints/content.ts` is the content script. It resolves the page to a surface, starts `createRuntime(host, { ref: "marimo-glance:<surface>" })` and/or `createLinkOut(link, { dismissals })`, and stops them when WXT invalidates the context.
- `link-out-dismissals.ts` keeps the molab pill's dismissals in `storage.local`.
- `enabled-hosts.ts` and `registrations.ts` track opt-in and self-hosted origins and register the content script on them; `entrypoints/background.ts` re-syncs those registrations whenever a permission or a stored instance changes (and at startup), and injects the script into already-open tabs of newly registered origins.
- `entrypoints/popup/` is the React popup from the toolbar icon: whether the extension is active on the current site, and the buttons to enable or disable it.
- `wxt.config.ts` holds the manifest: name, description, install-time `host_permissions`, and the optional permission ceiling for sites enabled later.

## Commands

```bash
pnpm --filter @marimo/extension dev            # Chrome, with live reload
pnpm --filter @marimo/extension dev:firefox
pnpm --filter @marimo/extension build          # builds output/chrome-mv3
pnpm --filter @marimo/extension build:firefox  # builds output/firefox-mv2
pnpm --filter @marimo/extension zip            # package for a store
```

To try it by hand, build it and load `output/chrome-mv3` as an unpacked extension from `chrome://extensions` with developer mode on.
