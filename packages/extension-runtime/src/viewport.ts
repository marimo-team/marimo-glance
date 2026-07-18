export interface ViewportFit {
	/** Recompute the iframe height. Call after the notebook becomes visible. */
	refit(): void;
	/** Detach the resize listener. */
	dispose(): void;
}

const MIN_HEIGHT_PX = 400;

/**
 * Size the notebook iframe to fill from its top edge down to the bottom of the
 * viewport, so it uses the remaining screen rather than overflowing a flat
 * `100vh`. Re-fits on resize; skips only when hidden (a zero-height rect, so a
 * measurement while the notebook is toggled off is a no-op).
 */
export function fitToViewport(notebook: HTMLElement): ViewportFit {
	const iframe = notebook.querySelector("iframe");
	if (!iframe) return { refit() {}, dispose() {} };

	const refit = () => {
		const rect = iframe.getBoundingClientRect();
		if (rect.height === 0) return; // hidden (e.g. display:none) — nothing to size.
		// Clamp the top to 0 so an iframe scrolled above the viewport still fills
		// the visible area rather than being skipped as if it were hidden.
		const available = window.innerHeight - Math.max(rect.top, 0);
		iframe.style.height = `${Math.max(MIN_HEIGHT_PX, Math.round(available))}px`;
	};

	refit();
	window.addEventListener("resize", refit);
	return { refit, dispose: () => window.removeEventListener("resize", refit) };
}
