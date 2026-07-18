/**
 * Framework-agnostic rendering core: turn marimo notebook source into a DOM
 * subtree GitHub can display in place of the raw Python.
 *
 * This module intentionally has no React (or any framework) dependency. It is
 * the portable heart of the extension — the same logic could back a
 * refined-github feature, which mounts plain DOM rather than React.
 */
import lzString from "lz-string";
import { className } from "./css-utils.js";
import type { PlaygroundOptions, RenderOptions } from "./types.js";

export const PLAYGROUND_ORIGIN = "https://marimo.app";

/**
 * Build a marimo playground URL that boots the notebook from the source
 * compressed into the hash. `embed=true` hides the playground's header for a
 * clean embed; it coexists with the `#code/` hash (unlike some params, which
 * make the playground drop the hash and fall back to its demo notebook).
 */
export function playgroundUrl(
	source: string,
	opts: PlaygroundOptions = {},
): string {
	const url = new URL(PLAYGROUND_ORIGIN);

	const urlQueryParams = new URLSearchParams({
		embed: "true",
	});
	if (opts.ref) {
		urlQueryParams.set("ref", opts.ref);
	}
	if (opts.theme) {
		urlQueryParams.set("theme", opts.theme);
	}

	url.search = urlQueryParams.toString();

	const compressed = lzString.compressToEncodedURIComponent(source);

	return `${url.toString()}#code/${compressed}`;
}

export function renderNotebookAsIframe(
	source: string,
	options: RenderOptions = {},
): HTMLElement {
	const container = document.createElement("div");
	container.className = className("notebook");

	const iframe = document.createElement("iframe");
	iframe.className = className("notebook__frame");
	iframe.src = playgroundUrl(source, {
		ref: options.ref,
		theme: options.theme,
	});
	iframe.title = "marimo notebook";
	iframe.referrerPolicy = "no-referrer";
	iframe.setAttribute(
		"sandbox",
		"allow-scripts allow-same-origin allow-popups allow-forms",
	);
	iframe.style.width = "100%";
	iframe.style.height = "600px";
	iframe.style.border = "0";
	container.append(iframe);

	return container;
}
