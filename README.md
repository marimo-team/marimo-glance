# marimo Glance

See marimo notebooks at a glance.

marimo notebooks are just Python files, so GitHub and gists show them as source code. This extension detects a notebook and adds a **"Switch to interactive marimo notebook"** button in the bottom-right of the page. Click it and the raw Python is replaced with an interactive WASM notebook. The **"See original"** button switches you back.

## Demo

<div align="center">
  <video src="https://github.com/user-attachments/assets/16a850fc-97a3-4a1e-a077-65621f417bde" width="600" controls></video>
</div>

## How it works

The extension watches the pages you open on GitHub and gists. On a `.py` file it reads the source and looks for a real top-level `app = marimo.App(...)` declaration (whitespace and a type annotation are fine, and it honors `import marimo as <alias>`), scanning only the first 4 KB. A passing mention of marimo in a comment, a string, or a nested function doesn't count, so ordinary Python files are left completely alone.

When it does find a notebook, it drops the **"Switch to interactive marimo notebook"** button in the bottom-right corner. Clicking it boots the notebook live through [marimo.app](https://marimo.app), running entirely in WebAssembly inside your browser, right where the code was. **"See original"** flips back to the raw source, and switching between the two never restarts the notebook once it is running.

A few things worth knowing:

- **Your code stays on your machine.** The notebook source is compressed into the page URL's fragment (the part after `#`) and handed straight to the in-browser WASM runtime. Browsers never send the fragment to a server, so your code, private repositories included, is never uploaded anywhere by the extension.
- **WebAssembly-compatible notebooks only.** The notebook runs under Pyodide, so anything that depends on packages or features unavailable in WASM will not work in the embed.
- **One exception to privacy: "Open in molab."** The marimo.app playground offers an _Open in molab_ action. If you use it, your code is sent to molab servers so it can run and be shared there. That is a deliberate step you take from inside the notebook, separate from the inline view.

> [!WARNING]
> **Edits are not saved.** The interactive notebook is a scratch space. You can run and tweak cells freely, but nothing is written back to GitHub or persisted, and a refresh starts you fresh from the original source.

## What's in here

It's a pnpm + [Turborepo](https://turbo.build) monorepo. The rendering logic is kept separate from the browser extension itself, so the interesting parts stay reusable if someone wants to drop them into another tool someday.

| Package                     | What it does                                                                                                               |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `@marimo/notebook-core`     | The portable core: detect a marimo notebook, build the playground URL, render the iframe. Knows nothing about any website. |
| `@marimo/extension-runtime` | Watches the page and puts up the opt-in switcher. Mounts the notebook, cleans it up, survives GitHub's soft navigations.   |
| `@marimo/host-github`       | Teaches the runtime about `github.com` blobs and `gist.github.com`.                                                        |
| `@marimo/host-gitlab`       | Teaches the runtime about `gitlab.com` blobs.                                                                              |
| `apps/extension`            | The actual [WXT](https://wxt.dev) extension for Chrome and Firefox. It just wires a host to the runtime.                   |

Supporting a new site means writing a small "host" that answers four questions (does this URL match, what's the source, where's the code element on the page, and optionally what's the page theme). The runtime does the rest, so you never have to touch it to add a site.

## Getting started

```bash
pnpm install
pnpm dev            # watch-build every package in parallel
```

To actually try the extension in a browser with live reload:

```bash
pnpm --filter @marimo/extension dev           # Chrome
pnpm --filter @marimo/extension dev:firefox   # Firefox
```

## Building and checking

```bash
pnpm build          # build everything; the extension ends up in apps/extension/output/
pnpm compile        # typecheck
pnpm lint           # oxlint
pnpm test           # run the tests
```

Finished builds land in `apps/extension/output/chrome-mv3` and `apps/extension/output/firefox-mv2`, ready to load unpacked. When it's time to ship, `pnpm --filter @marimo/extension zip` packages a store upload (`zip:firefox` for Firefox Add-ons).

## Contributing

Issues and PRs are welcome. Each package has its own README explaining what it's for and where its boundaries are, which is the fastest way to find where a change belongs.
