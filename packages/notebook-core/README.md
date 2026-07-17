# @marimo/notebook-core

The portable heart of the project. It works on plain source strings and DOM nodes, and that's it. No website-specific logic, no browser-extension APIs, no UI framework. Everything else in the repo builds on top of this package, and this package depends on nothing else in the repo.

Keeping it this clean is the point: it could just as easily back a different tool that mounts plain DOM.

## What you can import

- `isMarimoNotebook(source)` tells you whether some Python source is a marimo notebook. It looks for a real top-level `app = marimo.App(...)` (whitespace and a type annotation are fine, and it honors an `import marimo as <alias>`) within the first 4 KB. A stray mention of marimo in a comment, a string, or a nested function won't fool it.
- `isPythonPath(path)` is the obvious `.py` check.
- `playgroundUrl(source, { ref?, theme? })` builds the marimo.app embed URL, compressing the notebook into the `#code/` hash.
- `renderNotebookAsIframe(source, options)` gives you the notebook iframe as a DOM node.
- `className(...)` and `EXT_CSS_CLASS_PREFIX` keep our CSS class names namespaced so they don't collide with the host page.

Types you'll want: `Host`, `PlaygroundOptions`, `RenderOptions`, `Theme`, `View`.

## The `Host` contract

A host is how you teach the rest of the system about one family of websites:

```ts
interface Host {
  id: string;
  matches(url: URL): boolean;
  getSource(url: URL): Promise<string | null>;
  findAnchor(): HTMLElement | null;   // the page's original code element
  readTheme?(): Theme;                 // optional: read the page's theme
}
```

`findAnchor()` returns the code element the runtime hides while the notebook is showing. If the page isn't ready yet, return `null` and the runtime will try again on the next tick.
