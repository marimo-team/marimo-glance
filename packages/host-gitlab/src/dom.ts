import type { Theme } from "@marimo/notebook-core";

/**
 * The rendered-code container on a blob view. GitLab nests the syntax-highlighted
 * source under a stable `blob-viewer-file-content` test id; the enclosing
 * `.blob-viewer` is the outermost code-only element, a sibling of the sticky file
 * header (`.js-file-title`). Anchoring to `.blob-viewer` hides the whole code body
 * — with no empty wrapper left behind — while keeping the header (filename, raw
 * link, actions) visible. Climbing from the test id keeps this working if the
 * intermediate markup shifts; the content element itself is the fallback.
 */
export function findBlobAnchor(doc: Document): HTMLElement | null {
	const content = doc.querySelector<HTMLElement>(
		"[data-testid='blob-viewer-file-content'], .file-content, .blob-content",
	);
	return content?.closest<HTMLElement>(".blob-viewer") ?? content ?? null;
}

/**
 * GitLab records the active theme as a `gl-*` class on `<html>` (`gl-dark`,
 * `gl-light`, or `gl-system` when following the OS). The class is read from both
 * `<html>` and `<body>` so a future move of the flag still resolves; anything
 * other than an explicit dark/light class maps to `system`.
 */
export function readGitLabTheme(doc: Document): Theme {
	const classes = new Set([
		...doc.documentElement.classList,
		...doc.body.classList,
	]);
	if (classes.has("gl-dark")) return "dark";
	if (classes.has("gl-light")) return "light";
	return "system";
}
