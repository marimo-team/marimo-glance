import type { Host, Theme } from "@marimo/notebook-core";
import { isMarimoNotebook } from "@marimo/notebook-core";
import { type Controller, type ControllerOptions, createController } from "./controller.js";
import { createNotebookView } from "./notebook-view.js";
import { installSwitcher, type Switcher, savedView } from "./switcher.js";
import { resolveTheme } from "./theme.js";

export interface RuntimeOptions extends Pick<ControllerOptions, "schedule"> {
  /** Provenance tag forwarded to the playground URL as `ref`. */
  ref?: string;
  /** Milliseconds to wait for the iframe before treating it as blocked. */
  loadTimeoutMs?: number;
}

/** The reconcile identity of a page: distinct branch/tag refs must differ. */
function pageKey(url: URL): string {
  return url.pathname + url.search;
}

/**
 * Mounts the rendered notebook in place of the source whenever the page settles
 * into a marimo notebook the host recognises. Passes are idempotent and keyed
 * on the URL, so a re-render that wipes the injection is repaired on the next tick.
 */
export function createRuntime(host: Host, options: RuntimeOptions = {}): Controller {
  let injectedAgainst: HTMLElement | null = null;
  let handledKey: string | null = null;
  // The page whose source is being fetched (see `ControllerOptions.reset`).
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
    // A same-page re-render can detach our injection without any navigation.
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
 * Wire the notebook view to the floating switcher; the teardown restores the
 * original code element. The switcher starts in the saved view, the original
 * code by default, so the notebook is opt-in.
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
