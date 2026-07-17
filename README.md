# marimo live

See a [marimo](https://marimo.io) notebook on GitHub? Run it right there, in the page, without cloning anything.

marimo notebooks are just Python files, so GitHub and gists show them as source code. This extension spots a notebook, drops a little **"Switch to interactive notebook"** pill on the page, and when you click it the notebook boots up live (via [marimo.app](https://marimo.app), running in WebAssembly) right where the code was. Your original view is one click away, and flipping between the two never restarts the notebook.

Nothing happens until you ask for it. No auto-replacing your code, no surprises.

## Demo

<div align="center">
  <video src="https://github.com/user-attachments/assets/16a850fc-97a3-4a1e-a077-65621f417bde" width="600" controls></video>
</div>

## What's in here

It's a pnpm + [Turborepo](https://turbo.build) monorepo. The rendering logic is kept separate from the browser extension itself, so the interesting parts stay reusable if someone wants to drop them into another tool someday.


| Package                     | What it does                                                                                                               |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `@marimo/notebook-core`     | The portable core: detect a marimo notebook, build the playground URL, render the iframe. Knows nothing about any website. |
| `@marimo/extension-runtime` | Watches the page and puts up the opt-in switcher. Mounts the notebook, cleans it up, survives GitHub's soft navigations.   |
| `@marimo/host-github`       | Teaches the runtime about `github.com` blobs and `gist.github.com`.                                                        |
| `@marimo/host-gitlab`       | A placeholder for GitLab support. Not built yet.                                                                           |
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

One local quirk worth knowing: if you're on a setup where `pnpm` runs inside a restricted sandbox, it may fail on an `fnm` symlink permission error. Run `pnpm` with the sandbox off. Plain `tsc` and `node` are fine either way.