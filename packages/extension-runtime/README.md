# @marimo/extension-runtime

The part that actually runs on a live page and drives the whole experience. Give it a `Host` or a `NotebookLink` and it takes care of the rest. It has no idea which website it's on, which is what lets one runtime serve every site. Its only internal dependency is `@marimo/notebook-core`.

## What you can import

- `createRuntime(host, options?)` renders marimo notebooks for a `Host`.
- `createLinkOut(link, { dismissals, schedule? })` offers Jupyter notebooks to molab for a `NotebookLink`.

Both return a `Controller` with `start()`, `stop()`, and `syncNow()`. The runtime's options:

- `ref` is a provenance tag passed along to the playground URL.
- `schedule` lets you control how reconcile passes are deferred. It defaults to `requestAnimationFrame`, and tests swap in their own so timing is deterministic.
- `loadTimeoutMs` is how long to wait for the iframe before deciding it's blocked.

## How it works

Call `start()` and the runtime watches the page. Every pass it makes is idempotent and keyed on the URL, so extra observer ticks are cheap, and if the page re-renders and wipes out our injection, the next tick quietly puts it back.

When the page settles into a marimo notebook the host recognizes, the runtime floats the opt-in switcher. The notebook iframe is built the first time you opt in, then kept around across toggles, so switching back and forth never reboots the WASM runtime. Your choice is remembered in `sessionStorage`.

If the playground can't load, either because of a Content Security Policy violation or a load timeout, the runtime restores the original code and logs loudly so the failure isn't silent.

## The molab pill

`createLinkOut` floats an "Open in molab" link in the same corner whenever the link recognizes the page. Its × discloses two choices: hide this notebook, or hide the whole site. The runtime never touches browser storage itself; the caller injects a `DismissalStore`:

```ts
interface DismissalStore {
  isDismissed(notebook: { sourceUrl: string; site: string }): Promise<boolean>;
  dismiss(dismissal: Dismissal): Promise<void>;
  subscribe(onChange: () => void): () => void; // changes made elsewhere, e.g. another tab
}
```

A lookup is made once per notebook, not once per mutation tick, and `subscribe` lets a change made in another tab or the extension popup apply without a reload.
