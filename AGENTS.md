# Marimo Glance

A pnpm + Turborepo monorepo that detects marimo `.py` notebooks on code-hosting sites and renders them as live interactive WASM notebooks inline via a browser extension, replacing the raw Python view.

## Repo layout

```
packages/
  notebook-core/        Public API: detect, render, playground URL, types
  extension-runtime/    Reconcile-on-observe controller + switching UI
  host-github/          GitHub.com + gist.github.com implementation
  host-gitlab/          Placeholder (not yet implemented)
apps/
  extension/            WXT browser extension (Chrome + Firefox)
```

## Core invariant: dependency direction

**This is the property to protect.** The dependency graph must flow inbound:

```
notebook-core
  ↑         ↑
  |         |
runtime   github-host   gitlab-host
  ↑         ↑            ↑
  +----+----+            |
       |                 |
     extension ←--------+
```

- `notebook-core` imports **nothing internal**: zero monorepo deps. Ships: `isMarimoNotebook()`, `isPythonPath()`, `playgroundUrl()`, `renderNotebookAsIframe()`, plus types (`Host`, `Theme`, `View`, `RenderOptions`, `PlaygroundOptions`).
- Hosts and runtime import **only `notebook-core`**. No circular deps, no reaching sideways.
- The extension wires a host + runtime together.
- **Adding a new host requires zero runtime edits.** Implement the `Host` interface and pass it to `createRuntime()`.

## The Host interface

A host bridges the page's DOM and source. Implement it to add a new platform:

```typescript
interface Host {
  id: string;
  matches(url: URL): boolean;          // Does this page belong to us?
  getSource(url: URL): Promise<string | null>;  // Fetch .py source
  findAnchor(): HTMLElement | null;    // Original code element (insert before, hide)
  readTheme?(): Theme;                 // Optional: detect page theme (light/dark/system)
}
```

The extension passes the host to `createRuntime(host)`, which handles detection, mounting, switching, and resilience, no host-specific logic needed in the runtime.

## Public APIs

### `@marimo/notebook-core`

- `isMarimoNotebook(source)`: detect marimo notebook from first 4096 chars
- `isPythonPath(path)`: check if path ends `.py`
- `playgroundUrl(source, opts?)`: compress notebook, return marimo.app URL with `embed=true`
- `renderNotebookAsIframe(source, opts?)`: build iframe DOM subtree
- `className(suffix)`: CSS class builder with `mv-` prefix
- Types: `Host`, `Theme`, `View`, `PlaygroundOptions`, `RenderOptions`

### `@marimo/extension-runtime`

- `createRuntime(host, options?)` → `{ start(), stop(), syncNow() }`: host-agnostic reconcile-on-observe controller
  - `start()`: begin observing; run initial reconcile
  - `stop()`: disconnect observer, teardown injection, reject further work
  - `syncNow()`: run one reconcile pass (used in tests and manual triggers)
- `RuntimeOptions`: `ref` (provenance tag), `schedule` (injectable scheduler), `loadTimeoutMs` (iframe timeout)

### `@marimo/host-github`

- `githubHost`: Host impl for github.com (blobs) + gist.github.com
  - Blob: source from `/blob/` → `/raw/` conversion
  - Gist: source + anchor from DOM (first `.py` file)
  - `readTheme()` from `<html data-color-mode>`
- Helpers: `isBlobUrl()`, `isGistUrl()`, `blobRawUrl()`, `findBlobAnchor()`, `findGistPythonFile()`, `readGitHubTheme()`

## Commands

All commands run through Turbo at the repo root:

- `pnpm build`: compile all packages; outputs to `dist/` (packages) or `output/` (extension)
- `pnpm dev`: watch mode (tsc --watch per package, WXT hot reload for extension)
- `pnpm compile`: typecheck only (tsc --noEmit)
- `pnpm lint`: oxlint across all source
- `pnpm test`: run tests (node --test per package)
- `pnpm clean`: remove build artifacts

Per-package scripts (e.g., `cd packages/notebook-core && pnpm build`) work too, but prefer repo-level commands.

## Build & test details

- **Language:** TypeScript 5.9.3, target ES2022
- **Linter:** oxlint (replaces eslint)
- **Tests:** native Node test runner (`node --test`), jsdom for DOM tests
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

## Adding a new host

1. Create `packages/host-<platform>/` with the structure:
   ```
   package.json       (list @marimo/notebook-core as a dep)
   tsconfig.json
   src/index.ts       (export your Host instance + any helpers)
   src/*.ts           (implementation)
   test/*.test.mjs    (tests)
   ```
2. Implement the `Host` interface in `src/host.ts`
3. Add the package to the extension's `package.json` if you want it wired in (or leave it as a standalone lib)
4. In the extension's content script, import and pass the new host to `createRuntime()`

That's it: no changes to the runtime or core.

## Notes

- The extension's content script runs on `github.com/*` and `gist.github.com/*` only (see `apps/extension/wxt.config.ts`)
- Hosts share the runtime's floating UI switcher (notebook ↔ original code), theme detection, CSP fallback, and reconcile-on-observe logic
- GitLab host is stubbed; phase 5 of the original plan
- Playground ref is `marimo-glance:<surface>` (e.g., `marimo-glance:github`, `marimo-glance:gist`)
