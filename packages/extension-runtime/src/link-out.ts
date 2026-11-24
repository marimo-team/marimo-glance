import type { NotebookLink } from "@marimo/notebook-core";
import { molabUrl } from "@marimo/notebook-core";
import { type Controller, createController } from "./controller.js";
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

export interface LinkOutOptions {
  dismissals: DismissalStore;
  /** Defer a coalesced reconcile pass. Defaults to `requestAnimationFrame`. */
  schedule?: (callback: () => void) => void;
}

/**
 * A reconcile-on-observe controller for pages that only offer a way out to
 * molab. It keeps the pill in step with the notebook the page currently shows,
 * so SPA navigation between notebooks moves or removes it, and a dismissal made
 * in another tab or undone from the popup applies without a reload.
 */
export function createLinkOut(link: NotebookLink, options: LinkOutOptions): Controller {
  const { dismissals } = options;

  let pill: { sourceUrl: string; view: LinkOutPill } | null = null;
  // The notebook whose dismissal is known and applied, so a busy page does not
  // re-read storage on every mutation tick.
  let decidedFor: string | null = null;
  // The notebook whose dismissal is being looked up. Passes for the same
  // notebook wait on that lookup; one that resumes to find the claim moved on
  // (navigation, reset, stop) drops its result.
  let checkingFor: string | null = null;

  function hidePill(): void {
    pill?.view.dispose();
    pill = null;
  }

  function reset(): void {
    hidePill();
    decidedFor = null;
    checkingFor = null;
  }

  async function reconcile(): Promise<void> {
    // The page removed the pill (e.g. re-rendered `body`); decide again.
    if (pill && !pill.view.isConnected) {
      pill = null;
      decidedFor = null;
    }

    const sourceUrl = link.sourceUrl(new URL(window.location.href));
    if (sourceUrl === null) {
      reset();
      return;
    }
    if (sourceUrl === decidedFor || sourceUrl === checkingFor) return;
    // A pill for this notebook stays up while a store change is re-checked.
    if (pill?.sourceUrl !== sourceUrl) hidePill();

    const notebook = { sourceUrl, site: window.location.hostname };
    checkingFor = sourceUrl;
    const dismissed = await dismissals.isDismissed(notebook).catch((error: unknown) => {
      // Storage is unreadable, typically because the extension was reloaded.
      // Stay hidden rather than resurface a pill the viewer may have hidden.
      console.error("[marimo-glance] failed to read molab pill dismissals", error);
      return true;
    });
    if (checkingFor !== sourceUrl) return;
    checkingFor = null;
    decidedFor = sourceUrl;

    if (dismissed) hidePill();
    else if (!pill) showPill(notebook);
  }

  function showPill(notebook: LinkedNotebook): void {
    const hide = (dismissal: Dismissal) => {
      // `decidedFor` stays set, so the pill stays down until the store reports
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
        decidedFor = null;
        checkingFor = null;
        trigger();
      }),
  });
}
