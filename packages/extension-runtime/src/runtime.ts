import type { Host, HostAnchor } from "@marimo/notebook-core";
import {
	isMarimoNotebook,
	renderNotebookAsIframe,
} from "@marimo/notebook-core";
import { guardCsp } from "./csp.js";
import { resolveTheme } from "./theme.js";
import { installToggle } from "./toggle.js";
import { fitToViewport } from "./viewport.js";

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

	function reset(): void {
		teardown?.();
		teardown = null;
		injectedAgainst = null;
		handledKey = null;
	}

	async function sync(): Promise<void> {
		// Self-heal: a same-page re-render can detach our injection without any
		// navigation, so drop stale state before deciding what to do.
		if (injectedAgainst && !injectedAgainst.isConnected) reset();

		const url = new URL(window.location.href);
		if (!host.matches(url)) {
			reset();
			return;
		}

		const key = url.pathname;
		if (key === handledKey) return;

		const anchor = host.findAnchor();
		if (!anchor) return; // DOM not ready yet; a later observer tick retries.
		handledKey = key;

		const source = await host.getSource(url);

		// The page may have navigated, torn down, or been stopped while awaiting.
		const fresh = host.findAnchor();
		if (disposed || new URL(window.location.href).pathname !== key || !fresh) {
			handledKey = null;
			return;
		}
		if (source === null || !isMarimoNotebook(source)) return;

		const notebook = renderNotebookAsIframe(source, {
			ref: options.ref,
			theme: resolveTheme(host),
		});
		teardown?.();
		teardown = mount(notebook, fresh, options.loadTimeoutMs);
		injectedAgainst = fresh.mount;
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
 * Insert the notebook before the host's code element, wire up the toggle,
 * viewport fitting, and CSP fallback, and return a teardown that fully reverses
 * the injection and restores the original code element.
 */
function mount(
	notebook: HTMLElement,
	anchor: HostAnchor,
	loadTimeoutMs?: number,
): () => void {
	anchor.mount.before(notebook);
	const stopFit = fitToViewport(notebook);
	const toggle = installToggle(notebook, anchor);
	const stopCsp = guardCsp(
		notebook,
		() => toggle.show("original"),
		loadTimeoutMs,
	);

	return () => {
		stopCsp();
		toggle.dispose();
		stopFit();
		notebook.remove();
		anchor.mount.style.display = "";
	};
}
