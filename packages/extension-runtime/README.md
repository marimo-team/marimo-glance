# @marimo/extension-runtime

The part that actually runs on a live page and drives the whole experience. Give it a `Host` and it takes care of the rest. It has no idea which website it's on, which is what lets one runtime serve every site. Its only internal dependency is `@marimo/notebook-core`.

## What you can import

- `createRuntime(host, options?)` returns a `Runtime` with `start()`, `stop()`, and `syncNow()`.

The options:

- `ref` is a provenance tag passed along to the playground URL.
- `schedule` lets you control how reconcile passes are deferred. It defaults to `requestAnimationFrame`, and tests swap in their own so timing is deterministic.
- `loadTimeoutMs` is how long to wait for the iframe before deciding it's blocked.

## How it works

Call `start()` and the runtime watches the page. Every pass it makes is idempotent and keyed on the URL, so extra observer ticks are cheap, and if the page re-renders and wipes out our injection, the next tick quietly puts it back.

When the page settles into a marimo notebook the host recognizes, the runtime floats the opt-in switcher. The notebook iframe is built the first time you opt in, then kept around across toggles, so switching back and forth never reboots the WASM runtime. Your choice is remembered in `sessionStorage`.

If the playground can't load, either because of a Content Security Policy violation or a load timeout, the runtime restores the original code and logs loudly so the failure isn't silent.
