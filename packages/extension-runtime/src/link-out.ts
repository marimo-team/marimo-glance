import { molabUrl, type NotebookLink } from "@marimo/notebook-core";
import { type Controller, type ControllerOptions, createController } from "./controller.js";
import { type LinkOutPill, mountLinkOutPill } from "./link-out-pill.js";

/** A notebook the pill is offered for, and the site (page hostname) showing it. */
export interface LinkedNotebook {
  sourceUrl: string;
  site: string;
}

/** What the viewer chose to hide: one notebook, or every notebook on a site. */
export type Dismissal = { scope: "notebook"; sourceUrl: string } | { scope: "site"; site: string };

/**
 * Remembers what the viewer waved away. Injected because persistence is the
 * extension's concern (`storage`), not the runtime's.
 */
export interface DismissalStore {
  isDismissed(notebook: LinkedNotebook): Promise<boolean>;
  dismiss(dismissal: Dismissal): Promise<void>;
  /** Report changes made anywhere, e.g. another tab or the popup restoring a site. */
  subscribe(onChange: () => void): () => void;
}

export interface LinkOutOptions extends Pick<ControllerOptions, "schedule"> {
  dismissals: DismissalStore;
}

/** Keeps the molab pill in step with the notebook the page shows, and with dismissals made elsewhere. */
export function createLinkOut(link: NotebookLink, options: LinkOutOptions): Controller {
  const { dismissals } = options;

  let pill: { sourceUrl: string; view: LinkOutPill } | null = null;
  // Not re-read on every mutation tick: `settledFor` has its dismissal applied,
  // `lookupFor` is being read (see `ControllerOptions.reset` for the claim rule).
  let settledFor: string | null = null;
  let lookupFor: string | null = null;

  function hidePill(): void {
    pill?.view.dispose();
    pill = null;
  }

  function reset(): void {
    hidePill();
    settledFor = null;
    lookupFor = null;
  }

  async function reconcile(): Promise<void> {
    // The page removed the pill, e.g. by re-rendering `body`.
    if (pill && !pill.view.isConnected) {
      hidePill();
      settledFor = null;
    }

    const sourceUrl = link.sourceUrl(new URL(window.location.href));
    if (sourceUrl === null) {
      reset();
      return;
    }
    if (sourceUrl === settledFor || sourceUrl === lookupFor) return;
    // A pill for this notebook stays up while a store change is re-checked.
    if (pill?.sourceUrl !== sourceUrl) hidePill();

    const notebook = { sourceUrl, site: window.location.hostname };
    lookupFor = sourceUrl;
    const [dismissed, importable] = await Promise.all([
      dismissals.isDismissed(notebook).catch((error: unknown) => {
        // Storage is unreadable, typically because the extension was reloaded.
        // Stay hidden rather than resurface a pill the viewer may have hidden.
        console.error("[marimo-glance] failed to read molab pill dismissals", error);
        return true;
      }),
      link.canImport?.(sourceUrl).catch((error: unknown) => {
        console.error("[marimo-glance] failed to check whether molab can import", error);
        return false;
      }) ?? true,
    ]);
    if (lookupFor !== sourceUrl) return;
    lookupFor = null;
    settledFor = sourceUrl;

    if (dismissed || !importable) hidePill();
    else if (!pill) showPill(notebook);
  }

  function showPill(notebook: LinkedNotebook): void {
    const hide = (dismissal: Dismissal) => {
      // `settledFor` stays set, so the pill stays down until the store reports
      // the write and the re-check confirms it.
      hidePill();
      dismissals.dismiss(dismissal).catch((error: unknown) => {
        console.error("[marimo-glance] failed to save molab pill dismissal", error);
      });
    };

    pill = {
      sourceUrl: notebook.sourceUrl,
      view: mountLinkOutPill({
        href: molabUrl(notebook.sourceUrl),
        site: notebook.site,
        onHideNotebook: () => hide({ scope: "notebook", sourceUrl: notebook.sourceUrl }),
        onHideSite: () => hide({ scope: "site", site: notebook.site }),
      }),
    };
  }

  return createController({
    reconcile,
    reset,
    schedule: options.schedule,
    watch: (trigger) =>
      dismissals.subscribe(() => {
        // A lookup in flight may have read the store before this change.
        settledFor = null;
        lookupFor = null;
        trigger();
      }),
  });
}
