import type { Theme } from "@marimo/notebook-core";

/**
 * The raw-code area on a blob view is the `<section>` wrapping GitHub's source
 * textarea, holding only the rendered code lines. Inserting the notebook before
 * it and hiding it leaves the surrounding chrome (commit bar, toolbar, symbols)
 * intact.
 */
export function findBlobAnchor(doc: Document): HTMLElement | null {
	const textarea = doc.querySelector("#read-only-cursor-text-area");
	return textarea?.closest("section") ?? null;
}

export interface GistFile {
	/** The element to insert the notebook before and hide (the code body). */
	anchor: HTMLElement;
	/** Absolute URL of the file's raw source, read from its "Raw" link. */
	rawUrl: string;
}

/**
 * Find the first Python file on a gist page. A gist can hold several files, but
 * the runtime drives a single anchor and source, so the first `.py` file wins.
 * Each file's "Raw" link carries the commit-pinned raw URL (the page URL cannot
 * name it), so the file is identified by that link ending in `.py`. The anchor
 * is the file's code body when present, so the file header — filename and Raw
 * link — stays visible above the notebook.
 */
export function findGistPythonFile(doc: Document): GistFile | null {
	for (const file of doc.querySelectorAll<HTMLElement>(".file")) {
		const raw = file.querySelector<HTMLAnchorElement>('a[href*="/raw/"]');
		if (!raw?.href.endsWith(".py")) continue;
		const anchor =
			file.querySelector<HTMLElement>(".blob-wrapper, .Box-body, .highlight") ??
			file;
		return { anchor, rawUrl: raw.href };
	}
	return null;
}

/**
 * GitHub records the resolved color mode on `<html data-color-mode>`. `auto`
 * (or anything unexpected) maps to `system` so the runtime follows the OS.
 */
export function readGitHubTheme(doc: Document): Theme {
	const mode = doc.documentElement.dataset.colorMode;
	return mode === "light" || mode === "dark" ? mode : "system";
}
