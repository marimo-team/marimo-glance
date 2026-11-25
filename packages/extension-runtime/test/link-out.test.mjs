import assert from "node:assert/strict";
import test from "node:test";

import { createLinkOut } from "../dist/index.js";
import { installDom } from "./dom.mjs";

const NOTEBOOK_URL = "https://github.com/o/r/blob/main/nb.ipynb";

const link = {
  sourceUrl: (url) => (url.pathname.endsWith(".ipynb") ? `${url.origin}${url.pathname}` : null),
};

/** An in-memory store that counts lookups and notifies subscribers like `storage.onChanged`. */
function memoryDismissals({ notebooks = [], sites = [] } = {}) {
  const store = {
    notebooks: new Set(notebooks),
    sites: new Set(sites),
    lookups: 0,
    listeners: new Set(),
    async isDismissed({ sourceUrl, site }) {
      store.lookups += 1;
      return store.notebooks.has(sourceUrl) || store.sites.has(site);
    },
    async dismiss(dismissal) {
      if (dismissal.scope === "site") store.sites.add(dismissal.site);
      else store.notebooks.add(dismissal.sourceUrl);
      store.changed();
    },
    subscribe(onChange) {
      store.listeners.add(onChange);
      return () => store.listeners.delete(onChange);
    },
    changed() {
      for (const listener of store.listeners) listener();
    },
  };
  return store;
}

/** A store whose lookups stay pending until released, to interleave passes. */
function gatedDismissals() {
  const store = memoryDismissals();
  const gates = [];
  const lookup = store.isDismissed;
  store.isDismissed = async (notebook) => {
    await new Promise((resolve) => gates.push(resolve));
    return lookup(notebook);
  };
  store.release = () => {
    for (const resolve of gates.splice(0)) resolve();
  };
  return store;
}

/** Runs scheduled passes only when flushed, so tests decide when observer ticks land. */
function manualSchedule() {
  const queue = [];
  return {
    schedule: (callback) => queue.push(callback),
    flush: () => {
      for (const callback of queue.splice(0)) callback();
    },
  };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

const $ = (selector) => globalThis.document.querySelector(selector);
const pill = () => $(".mv-link-out");
const anchor = () => $(".mv-link-out__link");
const toggle = () => $(".mv-link-out__toggle");
const menu = () => $(".mv-link-out__menu");
const items = () => [...globalThis.document.querySelectorAll(".mv-link-out__item")];

test("offers a molab link that opens in a new tab", async () => {
  installDom(NOTEBOOK_URL);
  const linkOut = createLinkOut(link, { dismissals: memoryDismissals() });

  await linkOut.syncNow();

  assert.equal(anchor().href, `https://molab.marimo.io/${NOTEBOOK_URL}`);
  assert.equal(anchor().target, "_blank");
  assert.match(anchor().rel, /noopener/);
  linkOut.stop();
});

test("shows nothing on a page that is not a notebook", async () => {
  installDom("https://github.com/o/r");
  const linkOut = createLinkOut(link, { dismissals: memoryDismissals() });

  await linkOut.syncNow();

  assert.equal(pill(), null);
  linkOut.stop();
});

test("the toggle discloses both scopes and moves focus into them", async () => {
  installDom(NOTEBOOK_URL);
  const linkOut = createLinkOut(link, { dismissals: memoryDismissals() });
  await linkOut.syncNow();
  assert.equal(menu().hidden, true);

  toggle().click();

  assert.equal(menu().hidden, false);
  assert.equal(toggle().getAttribute("aria-expanded"), "true");
  assert.deepEqual(
    items().map((item) => item.textContent),
    ["Hide for this notebook", "Hide on all of github.com"],
  );
  assert.equal(globalThis.document.activeElement, items()[0]);
  linkOut.stop();
});

test("Escape closes the options and returns focus to the toggle", async () => {
  const dom = installDom(NOTEBOOK_URL);
  const linkOut = createLinkOut(link, { dismissals: memoryDismissals() });
  await linkOut.syncNow();
  toggle().click();

  items()[0].dispatchEvent(
    new dom.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
  );

  assert.equal(menu().hidden, true);
  assert.equal(toggle().getAttribute("aria-expanded"), "false");
  assert.equal(globalThis.document.activeElement, toggle());
  linkOut.stop();
});

test("pressing outside the pill closes the options", async () => {
  const dom = installDom(NOTEBOOK_URL);
  const linkOut = createLinkOut(link, { dismissals: memoryDismissals() });
  await linkOut.syncNow();
  toggle().click();

  globalThis.document.body.dispatchEvent(new dom.window.Event("pointerdown", { bubbles: true }));

  assert.equal(menu().hidden, true);
  linkOut.stop();
});

test("hiding this notebook removes the pill and remembers only that notebook", async () => {
  installDom(NOTEBOOK_URL);
  const dismissals = memoryDismissals();
  const linkOut = createLinkOut(link, { dismissals });
  await linkOut.syncNow();

  toggle().click();
  items()[0].click();

  assert.equal(pill(), null);
  assert.deepEqual([...dismissals.notebooks], [NOTEBOOK_URL]);
  assert.deepEqual([...dismissals.sites], []);
  linkOut.stop();
});

test("hiding the site keys it on the page's hostname and covers its other notebooks", async () => {
  const dom = installDom(NOTEBOOK_URL);
  const dismissals = memoryDismissals();
  const linkOut = createLinkOut(link, { dismissals });
  await linkOut.syncNow();

  toggle().click();
  items()[1].click();
  assert.deepEqual([...dismissals.sites], ["github.com"]);

  dom.window.history.pushState({}, "", "/o/r/blob/main/other.ipynb");
  await linkOut.syncNow();
  assert.equal(pill(), null);
  linkOut.stop();
});

test("a dismissed notebook is looked up once, not on every pass", async () => {
  installDom(NOTEBOOK_URL);
  const dismissals = memoryDismissals({ notebooks: [NOTEBOOK_URL] });
  const linkOut = createLinkOut(link, { dismissals });

  await linkOut.syncNow();
  await linkOut.syncNow();

  assert.equal(pill(), null);
  assert.equal(dismissals.lookups, 1);
  linkOut.stop();
});

test("passes while a lookup is in flight wait for it instead of restarting it", async () => {
  installDom(NOTEBOOK_URL);
  const dismissals = gatedDismissals();
  const linkOut = createLinkOut(link, { dismissals });

  const first = linkOut.syncNow();
  await linkOut.syncNow();
  await linkOut.syncNow();
  dismissals.release();
  await first;

  assert.equal(dismissals.lookups, 1);
  assert.equal(globalThis.document.querySelectorAll(".mv-link-out").length, 1);
  linkOut.stop();
});

test("navigating to another notebook moves the pill, and away from one removes it", async () => {
  const dom = installDom(NOTEBOOK_URL);
  const linkOut = createLinkOut(link, { dismissals: memoryDismissals() });
  await linkOut.syncNow();

  dom.window.history.pushState({}, "", "/o/r/blob/main/other.ipynb");
  await linkOut.syncNow();
  assert.equal(
    anchor().href,
    "https://molab.marimo.io/https://github.com/o/r/blob/main/other.ipynb",
  );

  dom.window.history.pushState({}, "", "/o/r");
  await linkOut.syncNow();
  assert.equal(pill(), null);
  linkOut.stop();
});

test("a lookup superseded by navigation does not mount a stale pill", async () => {
  const dom = installDom(NOTEBOOK_URL);
  const dismissals = gatedDismissals();
  const linkOut = createLinkOut(link, { dismissals });

  const slow = linkOut.syncNow();
  dom.window.history.pushState({}, "", "/o/r");
  await linkOut.syncNow();
  dismissals.release();
  await slow;

  assert.equal(pill(), null);
  linkOut.stop();
});

test("a lookup in flight when stopped does not mount", async () => {
  installDom(NOTEBOOK_URL);
  const dismissals = gatedDismissals();
  const linkOut = createLinkOut(link, { dismissals });

  const pending = linkOut.syncNow();
  linkOut.stop();
  dismissals.release();
  await pending;

  assert.equal(pill(), null);
});

test("the pill comes back after the page removes it", async () => {
  installDom(NOTEBOOK_URL);
  const linkOut = createLinkOut(link, { dismissals: memoryDismissals() });
  await linkOut.syncNow();

  globalThis.document.body.replaceChildren();
  await linkOut.syncNow();

  assert.ok(pill());
  linkOut.stop();
});

test("a store change, like restoring the site from the popup, re-shows the pill live", async () => {
  installDom(NOTEBOOK_URL);
  const { schedule, flush } = manualSchedule();
  const dismissals = memoryDismissals({ sites: ["github.com"] });
  const linkOut = createLinkOut(link, { dismissals, schedule });
  linkOut.start();
  await settle();
  assert.equal(pill(), null);

  dismissals.sites.clear();
  dismissals.changed();
  flush();
  await settle();

  assert.ok(pill());
  linkOut.stop();
});

test("a dismissal made in another tab hides the pill here", async () => {
  installDom(NOTEBOOK_URL);
  const { schedule, flush } = manualSchedule();
  const dismissals = memoryDismissals();
  const linkOut = createLinkOut(link, { dismissals, schedule });
  linkOut.start();
  await settle();
  assert.ok(pill());

  await dismissals.dismiss({ scope: "site", site: "github.com" });
  flush();
  await settle();

  assert.equal(pill(), null);
  linkOut.stop();
});

test("an unreadable store hides the pill once instead of retrying every tick", async (t) => {
  installDom(NOTEBOOK_URL);
  t.mock.method(console, "error", () => {});
  const dismissals = memoryDismissals();
  dismissals.isDismissed = async () => {
    dismissals.lookups += 1;
    throw new Error("Extension context invalidated.");
  };
  const linkOut = createLinkOut(link, { dismissals });

  await linkOut.syncNow();
  await linkOut.syncNow();

  assert.equal(pill(), null);
  assert.equal(dismissals.lookups, 1);
  linkOut.stop();
});

test("a notebook the link says molab cannot import gets no pill, and is checked once", async () => {
  installDom(NOTEBOOK_URL);
  const checked = [];
  const privateLink = {
    ...link,
    canImport: async (sourceUrl) => {
      checked.push(sourceUrl);
      return false;
    },
  };
  const linkOut = createLinkOut(privateLink, { dismissals: memoryDismissals() });

  await linkOut.syncNow();
  await linkOut.syncNow();

  assert.equal(pill(), null);
  assert.deepEqual(checked, [NOTEBOOK_URL]);
  linkOut.stop();
});

test("an importable notebook gets the pill once the check passes", async () => {
  installDom(NOTEBOOK_URL);
  const linkOut = createLinkOut(
    { ...link, canImport: async () => true },
    { dismissals: memoryDismissals() },
  );

  await linkOut.syncNow();

  assert.ok(pill());
  linkOut.stop();
});

test("a failed import check hides the pill rather than guessing", async (t) => {
  installDom(NOTEBOOK_URL);
  const logged = t.mock.method(console, "error", () => {});
  const linkOut = createLinkOut(
    {
      ...link,
      canImport: async () => {
        throw new TypeError("Failed to fetch");
      },
    },
    { dismissals: memoryDismissals() },
  );

  await linkOut.syncNow();

  assert.equal(pill(), null);
  assert.equal(logged.mock.callCount(), 1);
  linkOut.stop();
});

test("a failed dismissal write is reported rather than thrown", async (t) => {
  installDom(NOTEBOOK_URL);
  const logged = t.mock.method(console, "error", () => {});
  const dismissals = memoryDismissals();
  dismissals.dismiss = async () => {
    throw new Error("quota");
  };
  const linkOut = createLinkOut(link, { dismissals });
  await linkOut.syncNow();

  toggle().click();
  items()[0].click();
  await settle();

  assert.equal(pill(), null);
  assert.equal(logged.mock.callCount(), 1);
  linkOut.stop();
});

test("stop removes the pill and unsubscribes from the store", async () => {
  installDom(NOTEBOOK_URL);
  const dismissals = memoryDismissals();
  const linkOut = createLinkOut(link, { dismissals, schedule: () => {} });
  linkOut.start();
  await settle();
  assert.equal(dismissals.listeners.size, 1);

  linkOut.stop();

  assert.equal(pill(), null);
  assert.equal(dismissals.listeners.size, 0);
});
