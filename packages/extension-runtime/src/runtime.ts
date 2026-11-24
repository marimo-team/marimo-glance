import type { Host, Theme } from "@marimo/notebook-core";
import { isMarimoNotebook } from "@marimo/notebook-core";
import { type Controller, createController } from "./controller.js";
import { createNotebookView } from "./notebook-view.js";
import { installSwitcher, type Switcher, savedView } from "./switcher.js";
import { resolveTheme } from "./theme.js";

export interface RuntimeOptions {
  /** Provenance tag forwarded to the playground URL as `ref`. */
  ref?: string;
  /** Defer a coalesced reconcile pass. Defaults to `requestAnimationFrame`. */
  schedule?: (callback: () => void) => void;
  /** Milliseconds to wait for the iframe before treating it as blocked. */
  loadTimeoutMs?: number;
}

/** The reconcile identity of a page: distinct branch/tag refs must differ. */
function pageKey(url: URL): string {
  return url.pathname + url.search;
}

/**
 * A host-agnostic reconcile-on-observe controller. It watches the page and,
 * whenever the page settles into a marimo notebook the host recognises, mounts
 * the rendered notebook in place of the source. Every reconcile pass is
 * idempotent and keyed on the URL, so repeated observer ticks are cheap and a
 * same-page re-render that wipes the injection is repaired on the next tick.
 */
export function createRuntime(host: Host, options: RuntimeOptions = {}): Controller {
  let injectedAgainst: HTMLElement | null = null;
  let handledKey: string | null = null;
  // The page whose source is being fetched. Passes for the same page wait on
  // that fetch instead of starting their own; a pass that resumes to find the
  // claim moved on (navigation, reset, stop) drops its result.
  let fetchingKey: string | null = null;
  let teardown: (() => void) | null = null;

  function reset(): void {
    teardown?.();
    teardown = null;
    injectedAgainst = null;
    handledKey = null;
    fetchingKey = null;
  }

  async function reconcile(): Promise<void> {
    // Self-heal: a same-page re-render can detach our injection without any
    // navigation, so drop stale state before deciding what to do.
    if (injectedAgainst && !injectedAgainst.isConnected) reset();

    const url = new URL(window.location.href);
    if (!host.matches(url)) {
      reset();
      return;
    }

    const key = pageKey(url);
    if (key === handledKey || key === fetchingKey) return;
    if (!host.findAnchor()) return; // DOM not ready yet; a later observer tick retries.

    fetchingKey = key;
    const source = await host.getSource(url).catch((error: unknown) => {
      console.error("[marimo-glance] failed to fetch notebook source", error);
      return null;
    });
    if (fetchingKey !== key) return;
    fetchingKey = null;

    const code = host.findAnchor();
    if (pageKey(new URL(window.location.href)) !== key || !code) return;
    // A failed fetch stays retryable; a clean fetch is the terminal outcome.
    if (source === null) return;

    handledKey = key;
    if (!isMarimoNotebook(source)) return;

    teardown?.();
    teardown = inject(code, source, resolveTheme(host), options);
    injectedAgainst = code;
  }

  return createController({ reconcile, reset, schedule: options.schedule });
}

/**
 * Wire the lazy notebook view to the floating switcher and return a teardown
 * that removes both and restores the original code element. The switcher starts
 * in the persisted view (original by default, so the notebook is opt-in) and
 * handles the CSP fallback for the view it drives.
 */
function inject(
  code: HTMLElement,
  source: string,
  theme: Theme,
  options: RuntimeOptions,
): () => void {
  let switcher: Switcher;
  const view = createNotebookView({
    code,
    source,
    theme,
    ref: options.ref,
    loadTimeoutMs: options.loadTimeoutMs,
    onBlocked: () => switcher.handleBlocked(),
  });
  switcher = installSwitcher({ view, initialView: savedView() });

  return () => {
    switcher.dispose();
    view.dispose();
  };
}
