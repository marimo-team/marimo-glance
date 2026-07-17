import type { Theme } from "@marimo/notebook-core";
import { renderNotebookAsIframe } from "@marimo/notebook-core";
import { guardCsp } from "./csp.js";
import { fitToViewport, type ViewportFit } from "./viewport.js";

export interface NotebookView {
	/** Reveal the notebook, mounting it on first call, and hide the code. */
	show(): void;
	/** Hide the notebook and reveal the original code, keeping the iframe. */
	hide(): void;
	/** Remove the notebook entirely and restore the original code. */
	dispose(): void;
}

export interface NotebookViewOptions {
	code: HTMLElement;
	source: string;
	theme: Theme;
	ref?: string;
	loadTimeoutMs?: number;
	/** Invoked when the iframe is blocked (CSP) or never loads. */
	onBlocked(): void;
}

/**
 * Lazily manage the notebook iframe. The iframe is created and inserted only on
 * the first `show()`, so a page the viewer never opens as a notebook pays no
 * cost. Later `show()`/`hide()` calls just flip `display`, so switching views
 * never reboots the WASM runtime.
 */
export function createNotebookView(options: NotebookViewOptions): NotebookView {
	let notebook: HTMLElement | null = null;
	let fit: ViewportFit | null = null;
	let stopCsp: (() => void) | null = null;

	const ensureMounted = (): HTMLElement => {
		if (notebook) return notebook;
		notebook = renderNotebookAsIframe(options.source, {
			ref: options.ref,
			theme: options.theme,
		});
		options.code.before(notebook);
		fit = fitToViewport(notebook);
		stopCsp = guardCsp(notebook, options.onBlocked, options.loadTimeoutMs);
		return notebook;
	};

	return {
		show() {
			const mounted = ensureMounted();
			mounted.style.display = "";
			options.code.style.display = "none";
			fit?.refit();
		},
		hide() {
			if (notebook) notebook.style.display = "none";
			options.code.style.display = "";
		},
		dispose() {
			stopCsp?.();
			fit?.dispose();
			notebook?.remove();
			options.code.style.display = "";
			notebook = null;
			fit = null;
			stopCsp = null;
		},
	};
}
