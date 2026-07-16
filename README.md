# marimo live

Browser extension that renders [marimo](https://marimo.io) notebooks as live
WASM notebooks inline on sites that show their `.py` source (GitHub today),
instead of the raw Python.

marimo notebooks are plain `.py` files, so on GitHub they display as source
code. This extension detects a marimo notebook in the blob view and renders it
in place.

## Architecture

The rendering core lives in `lib/marimo/` and has **no framework dependency** —
plain TypeScript that operates on source strings and DOM nodes. React is used
only for the extension's popup/options UI. This split keeps the core portable:
it could back a [refined-github](https://github.com/refined-github/refined-github)
feature (which mounts plain DOM, not React) without rewriting the rendering
logic.

- `lib/marimo/detect.ts` — recognise a marimo notebook from its source
- `lib/marimo/render.ts` — turn notebook source into a DOM subtree
- `entrypoints/content.ts` — GitHub content script: detect, read source, mount
- `entrypoints/popup/` — React popup UI

Built with [WXT](https://wxt.dev).

## Development

```bash
pnpm install
pnpm dev            # launch Chrome with the extension loaded, HMR enabled
pnpm dev:firefox    # same, for Firefox
```

## Build

```bash
pnpm compile        # typecheck
pnpm build          # production build to .output/chrome-mv3
pnpm zip            # packaged zip for store upload
```

## Status

Detection and content-script mounting are wired up; the actual notebook
rendering in `lib/marimo/render.ts` is a placeholder pending the real
implementation.
