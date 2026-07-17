# @marimo/host-github

The `Host` that teaches the runtime about GitHub: both regular blob pages on `github.com` and gists on `gist.github.com`. Its only internal dependency is `@marimo/notebook-core`.

## What you can import

- `githubHost` is the host itself. Its `matches` covers both surfaces, so you only need this one for all of GitHub.
- URL helpers: `isBlobUrl`, `blobRawUrl` (turns a blob URL into its raw-source URL), and `isGistUrl`.
- DOM helpers: `findBlobAnchor`, `findGistPythonFile`, and `readGitHubTheme`.
- The `GistFile` type.

## How GitHub differs from itself

- On a **blob** page (`github.com/*/blob/*.py`), the source comes from the `/raw/` URL derived from the blob path, and the anchor is the `<section>` wrapping the code viewer.
- On a **gist** (`gist.github.com/*`), the URL doesn't name a file, so we read the DOM instead: the first `.py` file (found via its "Raw" link) and its code container.
- `readTheme` reads GitHub's own `<html data-color-mode>`, mapping `auto` to `system`.

Heads up: a gist with several files only renders its first `.py` file. The `Host` contract is one source and one anchor per page, so multi-file gists are a known limitation rather than a bug.
