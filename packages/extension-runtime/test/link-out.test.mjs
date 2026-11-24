import assert from "node:assert/strict";
import test from "node:test";

import { createLinkOut } from "../dist/index.js";
import { installDom } from "./dom.mjs";

const NOTEBOOK_URL = "https://github.com/o/r/blob/main/nb.ipynb";

const link = {
  id: "test",
  sourceUrl: (url) => (url.pathname.endsWith(".ipynb") ? `${url.origin}${url.pathname}` : null),
};

function memoryDismissals(initial = []) {
  const notebooks = new Set(initial);
  const sites = new Set();
  return {
    notebooks,
    sites,
    isDismissed: async (sourceUrl) =>
      notebooks.has(sourceUrl) || sites.has(new URL(sourceUrl).hostname),
    dismiss: async (sourceUrl, scope) => {
      if (scope === "site") sites.add(new URL(sourceUrl).hostname);
      else notebooks.add(sourceUrl);
    },
  };
}

const menu = () => globalThis.document.querySelector(".mv-link-out__menu");
const items = () => [...globalThis.document.querySelectorAll(".mv-link-out__item")];
const openMenu = () => globalThis.document.querySelector(".mv-link-out__dismiss").click();

const pill = () => globalThis.document.querySelector(".mv-link-out");
const anchor = () => globalThis.document.querySelector(".mv-link-out__link");

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

test("the dismiss button opens a menu offering both scopes", async () => {
  installDom(NOTEBOOK_URL);
  const linkOut = createLinkOut(link, { dismissals: memoryDismissals() });
  await linkOut.syncNow();
  assert.equal(menu().hidden, true);

  openMenu();

  assert.equal(menu().hidden, false);
  assert.deepEqual(
    items().map((item) => item.textContent),
    ["Hide for this notebook", "Hide on all of github.com"],
  );
  linkOut.stop();
});

test("hiding this notebook removes the pill and remembers only that notebook", async () => {
  installDom(NOTEBOOK_URL);
  const dismissals = memoryDismissals();
  const linkOut = createLinkOut(link, { dismissals });
  await linkOut.syncNow();

  openMenu();
  items()[0].click();

  assert.equal(pill(), null);
  assert.deepEqual([...dismissals.notebooks], [NOTEBOOK_URL]);
  assert.deepEqual([...dismissals.sites], []);
  linkOut.stop();
});

test("hiding the site keeps the pill away from other notebooks on it", async () => {
  const dom = installDom(NOTEBOOK_URL);
  const dismissals = memoryDismissals();
  const linkOut = createLinkOut(link, { dismissals });
  await linkOut.syncNow();

  openMenu();
  items()[1].click();
  assert.deepEqual([...dismissals.sites], ["github.com"]);
  assert.equal(pill(), null);

  dom.window.history.pushState({}, "", "/o/r/blob/main/other.ipynb");
  await linkOut.syncNow();
  assert.equal(pill(), null);
  linkOut.stop();
});

test("a dismissed notebook stays hidden across later passes", async () => {
  installDom(NOTEBOOK_URL);
  const linkOut = createLinkOut(link, { dismissals: memoryDismissals([NOTEBOOK_URL]) });

  await linkOut.syncNow();
  await linkOut.syncNow();

  assert.equal(pill(), null);
  linkOut.stop();
});

test("repeated passes on one notebook keep a single pill", async () => {
  installDom(NOTEBOOK_URL);
  const linkOut = createLinkOut(link, { dismissals: memoryDismissals() });

  await linkOut.syncNow();
  await linkOut.syncNow();

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

test("stop removes the pill", async () => {
  installDom(NOTEBOOK_URL);
  const linkOut = createLinkOut(link, { dismissals: memoryDismissals() });
  await linkOut.syncNow();

  linkOut.stop();

  assert.equal(pill(), null);
});

test("a pass superseded during the dismissal lookup does not mount a stale pill", async () => {
  const dom = installDom(NOTEBOOK_URL);
  let release;
  const gate = new Promise((resolve) => (release = resolve));
  const dismissals = {
    isDismissed: async () => {
      await gate;
      return false;
    },
    dismiss: async () => {},
  };
  const linkOut = createLinkOut(link, { dismissals });

  const slow = linkOut.syncNow();
  dom.window.history.pushState({}, "", "/o/r");
  await linkOut.syncNow();
  release();
  await slow;

  assert.equal(pill(), null);
  linkOut.stop();
});
