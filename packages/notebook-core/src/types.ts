export type Theme = "light" | "dark" | "system";
export type View = "notebook" | "original";

export interface PlaygroundOptions {
	ref?: string;
	theme?: Theme;
}

export interface Host {
	id: string;
	matches(url: URL): boolean;
	getSource(url: URL): Promise<string | null>;
	/**
	 * The page's original code element: the node the runtime inserts the notebook
	 * before and hides while the notebook view is active, so returning to the
	 * original reveals the untouched code. Returns null when the DOM is not ready
	 * yet; the runtime retries on a later observer tick.
	 */
	findAnchor(): HTMLElement | null;
	/**
	 * Report the page's active theme, if the host can read it (e.g. from a DOM
	 * attribute). When absent, the runtime falls back to `system`.
	 */
	readTheme?(): Theme;
}

export interface RenderOptions extends PlaygroundOptions {}
