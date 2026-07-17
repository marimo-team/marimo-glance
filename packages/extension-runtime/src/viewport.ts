/**
 * A notebook container carrying a re-fit callback. The toggle stashes the fit
 * function here so it can re-run after the container is revealed, when its real
 * top edge is finally measurable.
 */
export type FittableNotebook = HTMLElement & { mvFit?: () => void };

const MIN_HEIGHT_PX = 400;

/**
 * Size the notebook iframe to fill from its top edge down to the bottom of the
 * viewport, so it uses the remaining screen rather than overflowing a flat
 * `100vh`. Re-fits on resize; skips when hidden (a zero-height rect). Returns a
 * function that detaches the resize listener.
 */
export function fitToViewport(notebook: HTMLElement): () => void {
	const iframe = notebook.querySelector("iframe");
	if (!iframe) return () => {};

	const fit = () => {
		const top = iframe.getBoundingClientRect().top;
		if (top <= 0) return;
		iframe.style.height = `${Math.max(MIN_HEIGHT_PX, Math.round(window.innerHeight - top))}px`;
	};

	fit();
	window.addEventListener("resize", fit);
	(notebook as FittableNotebook).mvFit = fit;
	return () => window.removeEventListener("resize", fit);
}
