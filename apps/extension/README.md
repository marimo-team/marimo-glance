# @marimo/extension

The actual browser extension, built with [WXT](https://wxt.dev). There's barely any logic here on purpose: it wires a host to the runtime and lets the packages do the real work.

## What's in here

- `entrypoints/content.ts` is the content script. It figures out whether it's on `github` or a `gist` from the hostname, starts the runtime with `createRuntime(githubHost, { ref: "marimo-glance:<surface>" })`, and shuts it down when WXT invalidates the context.
- `entrypoints/popup/` is the little popup you get from the toolbar icon, written as plain HTML.
- `wxt.config.ts` holds the manifest name, description, and the `host_permissions` for github.com, gist.github.com, and the two raw-content hosts.

One `createRuntime(githubHost)` handles both github.com and gists, because the host's `matches` already spans both. Adding GitLab later is just another host plus a manifest permission, no runtime changes.

## Commands

```bash
pnpm --filter @marimo/extension dev            # Chrome, with live reload
pnpm --filter @marimo/extension dev:firefox
pnpm --filter @marimo/extension build          # builds output/chrome-mv3
pnpm --filter @marimo/extension build:firefox  # builds output/firefox-mv2
pnpm --filter @marimo/extension zip            # package for a store
```

To try it by hand, build it and load `output/chrome-mv3` as an unpacked extension from `chrome://extensions` with developer mode on.
