export type Theme = "light" | "dark" | "system";
export type View = "notebook" | "original";

export interface PlaygroundOptions {
	ref?: string;
	theme?: Theme;
}

export interface HostAnchor {
	/**
	 * The page's original code element. The runtime inserts the notebook
	 * immediately before it and hides it while the notebook view is active, so
	 * switching back to "Original" reveals the untouched code.
	 */
	mount: HTMLElement;
	/** Where the runtime appends its Notebook/Original toggle. */
	toggleContainer: HTMLElement;
}

export interface Host {
	id: string;
	matches(url: URL): boolean;
	getSource(url: URL): Promise<string | null>;
	findAnchor(): HostAnchor | null;
	/**
	 * Report the page's active theme, if the host can read it (e.g. from a DOM
	 * attribute). When absent, the runtime falls back to `system`.
	 */
	readTheme?(): Theme;
}

export interface RenderOptions extends PlaygroundOptions {
	sourceUrl?: string;
}
