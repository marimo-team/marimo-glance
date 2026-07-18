# Contributing to Marimo Glance

Thanks for your interest in contributing! Marimo Glance is a browser extension that detects marimo notebooks on code-hosting sites and renders them as live, interactive WASM notebooks inline. Issues and pull requests are welcome.

By participating in this project, you agree to abide by our [Code of Conduct](./CODE_OF_CONDUCT.md).

## Ways to contribute

- **Report bugs** and **request features** through the [issue templates](https://github.com/marimo-team/marimo-glance/issues/new/choose).
- **Add support for a new site** (a "host") — see [Adding a new host](#adding-a-new-host) below.
- **Improve the docs**, tests, or developer experience.

For large changes or anything that touches a package's public API, please open an issue or start a discussion first so we can agree on the approach before you invest time in a PR.

## Development setup

This is a pnpm + [Turborepo](https://turbo.build) monorepo. You'll need [pnpm](https://pnpm.io) installed.

```bash
pnpm install
pnpm dev            # watch-build every package in parallel
```

To try the extension in a browser with live reload:

```bash
pnpm --filter @marimo/extension dev           # Chrome
pnpm --filter @marimo/extension dev:firefox   # Firefox
```

Load the unpacked build from `apps/extension/output/chrome-mv3/` (or `firefox-mv2/`) in your browser's extension developer mode.

## Checks

Please make sure these pass before opening a PR:

```bash
pnpm compile        # typecheck
pnpm lint           # oxlint
pnpm test           # run the tests
pnpm build          # full build (extension lands in apps/extension/output/)
```

## Building the extension from source

These steps reproduce the exact packaged extension that is published to the
Chrome Web Store and Firefox Add-ons, starting from a clean checkout or the
source archive submitted to Firefox Add-ons.

Requirements:

- Node.js 24
- pnpm 11.11.0 — pinned in the root `package.json` `"packageManager"` field, so
  `corepack enable` selects the right version automatically.

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm build                                    # compiles the @marimo/* libraries
pnpm --filter @marimo/extension build:firefox # or `build` for Chrome
```

The built extension lands in `apps/extension/output/firefox-mv2/` (or
`chrome-mv3/` for Chrome). Run `pnpm build` before the browser-specific step: it
compiles the `@marimo/*` workspace libraries the extension imports, and skipping
it makes the bundler fail to resolve those imports.

To produce the uploadable archives instead of an unpacked build, use
`pnpm --filter @marimo/extension zip` (Chrome) or `zip:firefox` (Firefox); the
Firefox command also emits a `-sources.zip` of this monorepo.

## Repository layout

The rendering logic is kept separate from the extension so the core stays reusable.

| Package                     | What it does                                                                    |
| --------------------------- | ------------------------------------------------------------------------------ |
| `@marimo/notebook-core`     | Portable core: detect a notebook, build the playground URL, render the iframe.  |
| `@marimo/extension-runtime` | Watches the page and mounts the opt-in switcher; survives soft navigations.     |
| `@marimo/host-github`       | Teaches the runtime about `github.com` blobs and `gist.github.com`.             |
| `@marimo/host-gitlab`       | Teaches the runtime about `gitlab.com` blobs.                                   |
| `apps/extension`            | The [WXT](https://wxt.dev) extension for Chrome and Firefox.                    |

### Core invariant: dependency direction

The dependency graph flows inbound and must stay that way:

- `notebook-core` imports **nothing internal** (zero monorepo dependencies).
- Hosts and the runtime import **only `notebook-core`** — never each other, never sideways.
- The extension wires a host and the runtime together.

A PR that breaks this direction won't be merged; keeping it intact is what lets the core be reused elsewhere.

## Adding a new host

Supporting a new site means writing a small "host" that answers four questions: does this URL match, what is the source, where is the code element on the page, and (optionally) what is the page theme. The runtime does the rest — you never edit it to add a site.

1. Create `packages/host-<platform>/` mirroring an existing host (`package.json` depending on `@marimo/notebook-core`, `tsconfig.json`, `src/`, `test/`).
2. Implement the `Host` interface in `src/host.ts` and export it from `src/index.ts`.
3. To ship it, add the package to the extension and pass your host to `createRuntime()` in the content script.

Each package has its own README explaining its boundaries — the fastest way to find where a change belongs.

## Pull requests

- Keep PRs focused; unrelated changes belong in separate PRs.
- Use [Conventional Commit](https://www.conventionalcommits.org) prefixes for titles (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`).
- Include a screenshot or screen recording for any visual or in-page change.
- Add or update tests for the behavior you change.
- Fill out the pull request template, including the checklist.

The `main` branch is protected: PRs require one approving review before merging.

## Questions

Ask in [GitHub Discussions](https://github.com/marimo-team/marimo/discussions) or on [Discord](https://marimo.io/discord).
