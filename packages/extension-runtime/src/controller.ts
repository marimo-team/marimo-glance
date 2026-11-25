export interface Controller {
  /** Begin observing the page and run an initial reconcile pass. */
  start(): void;
  /** Stop observing, remove anything mounted, and reject further work. */
  stop(): void;
  /** Run one reconcile pass immediately. Exposed for the initial pass and tests. */
  syncNow(): Promise<void>;
}

export interface ControllerOptions {
  /** Bring the page in step with what it currently shows. Must be idempotent. */
  reconcile(): Promise<void>;
  /**
   * Remove anything mounted and forget all progress, including work in flight.
   * Passes claim a key before awaiting and drop their result if the claim moved
   * on (navigation, reset, stop); same-key passes wait instead of restarting.
   */
  reset(): void;
  /** Extra change sources beyond DOM mutations, e.g. storage. Returns the unsubscribe. */
  watch?(trigger: () => void): () => void;
  /** Defer a coalesced pass. Defaults to `requestAnimationFrame`; injectable for tests. */
  schedule?: (callback: () => void) => void;
}

/**
 * The lifecycle shared by every reconcile-on-observe controller: watch the page,
 * coalesce bursts of mutations into one pass per frame, and stop cleanly.
 */
export function createController(options: ControllerOptions): Controller {
  const schedule = options.schedule ?? ((callback) => requestAnimationFrame(callback));

  let observer: MutationObserver | null = null;
  let unwatch: (() => void) | null = null;
  let scheduled = false;
  let stopped = false;

  async function reconcile(): Promise<void> {
    if (!stopped) await options.reconcile();
  }

  function trigger(): void {
    if (scheduled || stopped) return;
    scheduled = true;
    schedule(() => {
      scheduled = false;
      void reconcile();
    });
  }

  return {
    start() {
      if (observer) return;
      stopped = false;
      observer = new MutationObserver(trigger);
      observer.observe(document.body, { childList: true, subtree: true });
      unwatch = options.watch?.(trigger) ?? null;
      void reconcile();
    },
    stop() {
      stopped = true;
      observer?.disconnect();
      observer = null;
      unwatch?.();
      unwatch = null;
      options.reset();
    },
    syncNow: reconcile,
  };
}
