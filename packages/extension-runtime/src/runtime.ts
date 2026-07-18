import type { Host, Theme } from "@marimo/notebook-core";
import { isMarimoNotebook } from "@marimo/notebook-core";
import { createNotebookView } from "./notebook-view.js";
import { installSwitcher, type Switcher, savedView } from "./switcher.js";
import { resolveTheme } from "./theme.js";

export interface RuntimeOptions {
	/** Provenance tag forwarded to the playground URL as `ref`. */
	ref?: string;
	/**
	 * Defer a coalesced reconcile pass. Defaults to `requestAnimationFrame`.
	 * Injectable so tests can drive scheduling deterministically.
	 */
	schedule?: (callback: () => void) => void;
	/** Milliseconds to wait for the iframe before treating it as blocked. */
	loadTimeoutMs?: number;
}

/** The reconcile identity of a page: distinct branch/tag refs must differ. */
function pageKey(url: URL): string {
	return url.pathname + url.search;
}

export interface Runtime {
	/** Begin observing the page and run an initial reconcile pass. */
	start(): void;
	/** Stop observing, remove any injection, and reject further work. */
	stop(): void;
	/** Run one reconcile pass immediately. Exposed for the initial pass and tests. */
	syncNow(): Promise<void>;
}

/**
 * A host-agnostic reconcile-on-observe controller. It watches the page and,
 * whenever the page settles into a marimo notebook the host recognises, mounts
 * the rendered notebook in place of the source. Every reconcile pass is
 * idempotent and keyed on the URL, so repeated observer ticks are cheap and a
 * same-page re-render that wipes the injection is repaired on the next tick.
 */
export function createRuntime(
	host: Host,
	options: RuntimeOptions = {},
): Runtime {
	const schedule =
		options.schedule ?? ((callback) => requestAnimationFrame(callback));

	let injectedAgainst: HTMLElement | null = null;
	let handledKey: string | null = null;
	let teardown: (() => void) | null = null;
	let observer: MutationObserver | null = null;
	let scheduled = false;
	let disposed = false;
	// Bumped by every pass so a pass that resumes after `await` can tell whether
	// a newer pass has taken over and, if so, leave the shared state to it.
	let epoch = 0;

	function reset(): void {
		teardown?.();
		teardown = null;
		injectedAgainst = null;
		handledKey = null;
	}

	async function sync(): Promise<void> {
		const thisEpoch = ++epoch;

		// Self-heal: a same-page re-render can detach our injection without any
		// navigation, so drop stale state before deciding what to do.
		if (injectedAgainst && !injectedAgainst.isConnected) reset();

		const url = new URL(window.location.href);
		if (!host.matches(url)) {
			reset();
			return;
		}

		const key = pageKey(url);
		if (key === handledKey) return;

		const anchor = host.findAnchor();
		if (!anchor) return; // DOM not ready yet; a later observer tick retries.
		handledKey = key;

		const source = await host.getSource(url);

		// A newer pass started while awaiting; it owns the shared state now.
		if (thisEpoch !== epoch) return;

		// The page may have navigated, torn down, or been stopped while awaiting.
		const code = host.findAnchor();
		if (disposed || pageKey(new URL(window.location.href)) !== key || !code) {
			handledKey = null;
			return;
		}
		// A failed fetch stays retryable; only a page that fetched cleanly but is
		// not a notebook is memoized, which is the cheap, correct thing to skip.
		if (source === null) {
			handledKey = null;
			return;
		}
		if (!isMarimoNotebook(source)) return;

		teardown?.();
		teardown = inject(code, source, resolveTheme(host), options);
		injectedAgainst = code;
	}

	function trigger(): void {
		if (scheduled || disposed) return;
		scheduled = true;
		schedule(() => {
			scheduled = false;
			void sync();
		});
	}

	return {
		start() {
			if (observer) return;
			disposed = false;
			observer = new MutationObserver(trigger);
			observer.observe(document.body, { childList: true, subtree: true });
			void sync();
		},
		stop() {
			disposed = true;
			observer?.disconnect();
			observer = null;
			reset();
		},
		syncNow: sync,
	};
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
