import type { NotebookLink } from "@marimo/notebook-core";
import { molabUrl } from "@marimo/notebook-core";
import { type DismissalScope, type LinkOutPill, mountLinkOutPill } from "./link-out-pill.js";
import type { Runtime } from "./runtime.js";

/**
 * Remembers what the viewer waved away. Async and injected because persistence
 * is the extension's concern (`storage`), not the runtime's. `isDismissed` must
 * honor both scopes: a notebook dismissed on its own, or its whole site.
 */
export interface DismissalStore {
  isDismissed(sourceUrl: string): Promise<boolean>;
  dismiss(sourceUrl: string, scope: DismissalScope): Promise<void>;
}

export interface LinkOutOptions {
  dismissals: DismissalStore;
  /** Defer a coalesced reconcile pass. Defaults to `requestAnimationFrame`. */
  schedule?: (callback: () => void) => void;
}

/**
 * A reconcile-on-observe controller for pages that only offer a way out to
 * molab. It watches the page and keeps the pill in step with the notebook the
 * page currently shows, so SPA navigation between notebooks moves or removes it.
 */
export function createLinkOut(link: NotebookLink, options: LinkOutOptions): Runtime {
  const schedule = options.schedule ?? ((callback) => requestAnimationFrame(callback));

  let pill: LinkOutPill | null = null;
  // Set for dismissed notebooks too, so a busy SPA does not re-read storage per tick.
  let handledFor: string | null = null;
  let observer: MutationObserver | null = null;
  let scheduled = false;
  let disposed = false;
  // A pass that resumes after the dismissal lookup must not mount over a newer one.
  let epoch = 0;

  function unmount(): void {
    pill?.dispose();
    pill = null;
    handledFor = null;
  }

  async function sync(): Promise<void> {
    const thisEpoch = ++epoch;

    const sourceUrl = link.sourceUrl(new URL(window.location.href));
    if (sourceUrl === null) {
      unmount();
      return;
    }
    if (sourceUrl === handledFor) return;

    unmount();
    const dismissed = await options.dismissals.isDismissed(sourceUrl);
    if (disposed || thisEpoch !== epoch) return;

    handledFor = sourceUrl;
    if (dismissed) return;

    pill = mountLinkOutPill({
      href: molabUrl(sourceUrl),
      siteLabel: new URL(sourceUrl).hostname,
      onDismiss: (scope) => {
        // Keep `handledFor` so a mutation before the write lands cannot re-show it.
        pill?.dispose();
        pill = null;
        void options.dismissals.dismiss(sourceUrl, scope);
      },
    });
  }

  function trigger(): void {
    if (scheduled || disposed) return;
    scheduled = true;
    schedule(() => {
      scheduled = false;
      void sync();
    });
  }

  return {
    start() {
      if (observer) return;
      disposed = false;
      observer = new MutationObserver(trigger);
      observer.observe(document.body, { childList: true, subtree: true });
      void sync();
    },
    stop() {
      disposed = true;
      observer?.disconnect();
      observer = null;
      unmount();
    },
    syncNow: sync,
  };
}
