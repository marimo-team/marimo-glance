# marimo Glance

A pnpm + Turborepo monorepo that detects marimo `.py` notebooks on code-hosting sites and renders them as live interactive WASM notebooks inline via a browser extension, replacing the raw Python view. Jupyter `.ipynb` notebooks get a link out to molab instead.

## Repo layout

```
packages/
  notebook-core/        Public API: detect, render, playground URL, types
  extension-runtime/    Reconcile-on-observe controllers + floating UI (switcher, molab pill)
  host-github/          github.com + gist.github.com: Host and NotebookLink
  host-gitlab/          gitlab.com: Host
  host-colab/           colab.research.google.com: NotebookLink (no inline rendering)
apps/
  extension/            WXT browser extension (Chrome + Firefox)
```

## Core invariant: dependency direction

**This is the property to protect.** The dependency graph must flow inbound:

```
            notebook-core
  ↑          ↑          ↑          ↑
  |          |          |          |
runtime  host-github  host-gitlab  host-colab
  ↑          ↑          ↑          ↑
  +----------+----+-----+----------+
                  |
              extension
```

- `notebook-core` imports **nothing internal**: zero monorepo deps. Ships: `isMarimoNotebook()`, `isPythonPath()`, `isIpynbPath()`, `playgroundUrl()`, `renderNotebookAsIframe()`, `molabUrl()`, plus types (`Host`, `NotebookLink`, `Theme`, `View`, `RenderOptions`, `PlaygroundOptions`).
- Hosts and runtime import **only `notebook-core`**. No circular deps, no reaching sideways (`host-colab` re-implements the GitHub blob path check rather than importing `host-github`).
- The extension wires each site's hosts and links to the runtime's controllers.
- **Adding a new site requires zero runtime edits.** Implement `Host` and pass it to `createRuntime()`, or `NotebookLink` and pass it to `createLinkOut()`.
- A `host-<platform>` package is a platform adapter: it exports a `Host`, a `NotebookLink`, or both.

## The Host interface

A host bridges the page's DOM and source. Implement it to add a new platform:

```typescript
interface Host {
  id: string;
  matches(url: URL): boolean; // Does this page belong to us?
  getSource(url: URL): Promise<string | null>; // Fetch .py source
  findAnchor(): HTMLElement | null; // Original code element (insert before, hide)
  readTheme?(): Theme; // Optional: detect page theme (light/dark/system)
}
```

The extension passes the host to `createRuntime(host)`, which handles detection, mounting, switching, and resilience, no host-specific logic needed in the runtime.

## Public APIs

### `@marimo/notebook-core`

- `isMarimoNotebook(source)`: detect marimo notebook from first 16 KB
- `isPythonPath(path)`, `isIpynbPath(path)`: check the file extension
- `playgroundUrl(source, opts?)`: compress notebook, return marimo.app URL with `embed=true`
- `renderNotebookAsIframe(source, opts?)`: build iframe DOM subtree
- `molabUrl(sourceUrl)`: the molab URL that imports a notebook from its public URL
- `className(suffix)`: CSS class builder with `mv-` prefix
- Types: `Host`, `NotebookLink`, `Theme`, `View`, `PlaygroundOptions`, `RenderOptions`

### `@marimo/extension-runtime`

Both controllers return a `Controller` (`{ start(), stop(), syncNow() }`) built on one shared lifecycle in `controller.ts`:

- `start()`: begin observing; run initial reconcile
- `stop()`: disconnect observer, tear down anything mounted, reject further work
- `syncNow()`: run one reconcile pass (used in tests and manual triggers)

Passes are idempotent and keyed: a pass for the page already being fetched or looked up waits on that work instead of restarting it, and a pass that resumes after an `await` to find its claim gone (navigation, reset, stop) drops its result.

- `createRuntime(host, options?)`: mounts the notebook view and switcher for a `Host`
- `RuntimeOptions`: `ref` (provenance tag), `schedule` (injectable scheduler), `loadTimeoutMs` (iframe timeout)
- `createLinkOut(link, { dismissals, schedule? })`: mounts the "Open in molab" pill for a `NotebookLink`
- Types: `DismissalStore`, `Dismissal`, `LinkedNotebook`, `LinkOutOptions`

### `@marimo/host-github`

- `githubHost`: Host impl for github.com (blobs) + gist.github.com
  - Blob: source from `/blob/` → `/raw/` conversion
  - Gist: source + anchor from DOM (first `.py` file)
  - `readTheme()` from `<html data-color-mode>`
- `githubNotebookLink`: NotebookLink for `.ipynb` blobs on github.com, only for public repos (`canImport` asks github.com for the repo without cookies)
- Helpers: `isBlobUrl()`, `isIpynbBlobUrl()`, `isGistUrl()`, `blobRawUrl()`, `findBlobAnchor()`, `findGistPythonFile()`, `readGitHubTheme()`

## Link-outs: notebooks we do not render

Jupyter `.ipynb` notebooks (github.com blobs in public repos, GitHub-backed Colab pages) are not rendered in place. molab imports them from their public URL and converts them to marimo server-side, so the extension only offers a dismissable "Open in molab" pill. This is a separate concept from `Host`:

```typescript
interface NotebookLink {
  sourceUrl(url: URL): string | null; // URL molab imports, or null; runs every tick, keep it cheap
  canImport?(sourceUrl: string): Promise<boolean>; // optional: can molab really fetch it? checked once per notebook
}
```

- `createLinkOut(link, { dismissals })` (in `extension-runtime`) is the controller; `molabUrl()` in `notebook-core` builds the link.
- The pill's × discloses two scopes: hide this notebook, or hide on the whole site (the page's hostname). Dismissals go through a `DismissalStore` injected by the extension (`apps/extension/link-out-dismissals.ts`, on `storage.local`), keeping the runtime free of browser APIs. The store's `subscribe` relays `storage.onChanged`, so a dismissal in one tab, or the popup's "Show again", applies to open tabs without a reload.
- In `apps/extension/entrypoints/content.ts` a site has a `host`, a `link`, or both (github.com has both). Self-hosted instances get a host only: molab cannot fetch from them.
- Private notebooks are skipped where they can be detected: on github.com `canImport` sends a cookie-less `HEAD` for the repo, once per repo per page load (the page itself cannot say, since GitHub only renders its public-repo meta tag for signed-out viewers). Drive-backed Colab notebooks are skipped because they are private by default. A private GitHub repo opened through Colab cannot be told apart, so the pill still shows there.

## Sites: built-in, opt-in, and self-hosted

`apps/extension/hosts.ts` names the known sites:

- **Built-in** (`BUILT_IN_SITES`: github.com, gist.github.com, gitlab.com): install-time host permissions and static content-script matches.
- **Opt-in** (`OPT_IN_SITES`: colab.research.google.com): known sites the user enables from the popup. They stay out of the install-time permissions because a new static host permission makes Chrome disable the extension on update until the user re-approves. The permission grant alone records the choice.
- **Self-hosted**: any other origin the user enables as a GitHub or GitLab instance. `storage.local` maps the origin to its platform (`enabled-hosts.ts`).

Opt-in and self-hosted origins are requested through `optional_host_permissions` and get the content script via `registrations.ts`, which the background script keeps a function of the granted permissions and the stored instances: it re-syncs at startup, on install or update, on every permission grant or removal, and whenever `enabledHosts` changes, and injects into open tabs of newly registered origins. The popup only writes those two inputs, because the browser's permission prompt can close it. It requests before any `await`, since Firefox only honours a request made directly in the click handler. `activeTab` lets the popup read the current tab's URL before the site is enabled.

## Commands

All commands run through Turbo at the repo root:

- `pnpm build`: compile all packages; outputs to `dist/` (packages) or `output/` (extension)
- `pnpm dev`: watch mode (tsc --watch per package, WXT hot reload for extension)
- `pnpm compile`: typecheck only (tsc --noEmit)
- `pnpm lint`: oxlint across all source
- `pnpm test`: run tests (node --test per package, Vitest for the extension)
- `pnpm clean`: remove build artifacts

Per-package scripts (e.g., `cd packages/notebook-core && pnpm build`) work too, but prefer repo-level commands.

## Build & test details

- **Language:** TypeScript 5.9.3, target ES2022
- **Linter:** oxlint (replaces eslint)
- **Tests:** native Node test runner (`node --test`), jsdom for DOM tests. `apps/extension` uses Vitest with WXT's `fakeBrowser` (`apps/extension/test/`), because its `@/` aliases and `wxt/browser` imports need WXT's resolution
- **Extension:** WXT 0.20.27 (esbuild bundler, MV3 for Chrome, MV2 for Firefox)

Per-package structure:

- `src/index.ts`: public exports
- `src/*.ts`: implementation
- `test/*.test.mjs`: tests (ESM, run with `node --test`)
- `tsconfig.json`: package config (extends `../tsconfig.base.json`)

Extension build outputs:

- `apps/extension/output/chrome-mv3/`: Chrome production build
- `apps/extension/output/firefox-mv2/`: Firefox production build
- WXT generates `apps/extension/.wxt/` during build (gitignored)

## Important gotcha: pnpm sandbox restriction

**`pnpm` must run with the sandbox disabled in this environment.** The fnm multishell symlink causes EPERM under sandbox. Workaround:

```bash
pnpm build
```

This runs fine. Plain `tsc` and `node` are safe sandboxed, so you can run per-package commands that way:

```bash
cd packages/notebook-core
tsc --noEmit -p tsconfig.json  # ✓ sandboxed
node --test test/*.test.mjs    # ✓ sandboxed
```

## Development workflow

1. **Edit code** in any `packages/*/src/` or `apps/extension/entrypoints/`.
2. **Typecheck:** `pnpm compile` (or per-package `tsc --noEmit`)
3. **Test:** `pnpm test` (or per-package `node --test test/*.test.mjs`)
4. **Lint:** `pnpm lint`
5. **Dev mode:** `pnpm dev` (WXT watches extension, tsc watches packages)

For manual testing:

- `pnpm build` to produce a production build
- Load `apps/extension/output/chrome-mv3/` as an unpacked extension in Chrome dev mode (chrome://extensions)
- Or `pnpm dev` to auto-reload during development

## Adding a new site

1. Create `packages/host-<platform>/` with the structure:
   ```
   package.json       (list @marimo/notebook-core as a dep)
   tsconfig.json
   src/index.ts       (export your Host and/or NotebookLink + any helpers)
   src/*.ts           (implementation)
   test/*.test.mjs    (tests)
   ```
2. Implement `Host` in `src/host.ts` to render marimo notebooks, `NotebookLink` in `src/notebook-link.ts` to offer Jupyter notebooks to molab, or both
3. Add the package to the extension's `package.json`
4. Add the site to `BUILT_IN_SITES` or `OPT_IN_SITES` in `apps/extension/hosts.ts`, and its entry to `KNOWN_SURFACES` in the content script (a type error until you do). Prefer opt-in for a new site: a built-in one adds an install-time permission, which disables the extension on update for existing users until they re-approve.

That's it: no changes to the runtime or core.

## Notes

- The content script runs on `github.com/*`, `gist.github.com/*`, and `gitlab.com/*` from install (see `apps/extension/wxt.config.ts`), and on opt-in or self-hosted origins once the user enables them
- Hosts share the runtime's floating switcher (notebook ↔ original code), theme detection, CSP fallback, and reconcile-on-observe logic; the switcher and the molab pill share the floating corner (`floating.ts`)
- GitLab host is implemented (`gitlab.com` blobs), fetching raw source same-origin using the user's session
- Playground ref is `marimo-glance:<surface>` (e.g., `marimo-glance:github`, `marimo-glance:gist`)
