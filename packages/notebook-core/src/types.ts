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

/**
 * A page that shows a Jupyter notebook molab can import. Unlike a `Host`, a link
 * has nothing to render in place: the runtime only offers a way out to molab,
 * so no source, anchor, or theme is needed.
 */
export interface NotebookLink {
  /**
   * The URL molab imports the notebook from, or null when the page is not a
   * notebook molab could fetch. Query and hash are dropped so the same notebook
   * always yields the same URL. Called on every observer tick, so keep it cheap.
   */
  sourceUrl(url: URL): string | null;
  /**
   * Whether molab can actually fetch `sourceUrl`, for a link that cannot tell
   * from the URL alone (e.g. a private repo). Checked once per notebook before
   * the pill is offered; a rejection counts as no.
   */
  canImport?(sourceUrl: string): Promise<boolean>;
}

export interface RenderOptions extends PlaygroundOptions {}
