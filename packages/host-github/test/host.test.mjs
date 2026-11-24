import assert from "node:assert/strict";
import test from "node:test";

import { githubHost, githubNotebookLink } from "../dist/index.js";
import { installDom, seedBlobPage, seedGistPage, stubFetch } from "./dom.mjs";

const MARIMO = "import marimo\n\napp = marimo.App()\n";

test("matches blob .py views by path shape and gist.github.com pages", () => {
  assert.equal(githubHost.matches(new URL("https://github.com/o/r/blob/main/nb.py")), true);
  assert.equal(githubHost.matches(new URL("https://gist.github.com/o/abc123")), true);
  assert.equal(githubHost.matches(new URL("https://github.com/o/r/blob/main/x.md")), false);
  assert.equal(githubHost.matches(new URL("https://github.com/o/r")), false);
});

test("findAnchor returns the code section on a blob view", () => {
  const dom = installDom();
  const section = seedBlobPage(dom);
  assert.equal(githubHost.findAnchor(), section);
});

test("findAnchor returns null on a blob view before the code area renders", () => {
  installDom();
  assert.equal(githubHost.findAnchor(), null);
});

test("getSource fetches the derived raw URL on a blob view", async () => {
  installDom("https://github.com/o/r/blob/main/dir/nb.py");
  const calls = stubFetch(MARIMO);
  const source = await githubHost.getSource(new URL(globalThis.location.href));
  assert.equal(source, MARIMO);
  assert.deepEqual(calls, ["https://github.com/o/r/raw/main/dir/nb.py"]);
});

test("getSource returns null when the raw fetch is not ok", async () => {
  installDom();
  stubFetch("nope", { ok: false });
  assert.equal(await githubHost.getSource(new URL(globalThis.location.href)), null);
});

test("gist findAnchor and getSource use the first .py file's Raw link", async () => {
  const dom = installDom("https://gist.github.com/o/abc123");
  const raw = "https://gist.githubusercontent.com/o/abc123/raw/deadbeef/nb.py";
  const { body } = seedGistPage(dom, raw);
  assert.equal(githubHost.findAnchor(), body);

  const calls = stubFetch(MARIMO);
  const source = await githubHost.getSource(new URL(globalThis.location.href));
  assert.equal(source, MARIMO);
  assert.deepEqual(calls, [raw]);
});

test("gist findAnchor returns null when no file is Python", () => {
  const dom = installDom("https://gist.github.com/o/abc123");
  seedGistPage(dom, "https://gist.githubusercontent.com/o/abc123/raw/deadbeef/notes.md");
  assert.equal(githubHost.findAnchor(), null);
});

test("readTheme maps GitHub's color-mode attribute, defaulting to system", () => {
  const dom = installDom();
  assert.equal(githubHost.readTheme(), "system");
  dom.window.document.documentElement.dataset.colorMode = "dark";
  assert.equal(githubHost.readTheme(), "dark");
  dom.window.document.documentElement.dataset.colorMode = "auto";
  assert.equal(githubHost.readTheme(), "system");
});

/** A github.com page whose repo-visibility meta tag reads `visibility`, or has none. */
function installRepoPage(url, visibility) {
  const dom = installDom(url);
  if (visibility !== undefined) {
    const meta = dom.window.document.createElement("meta");
    meta.name = "octolytics-dimension-repository_public";
    meta.content = String(visibility === "public");
    dom.window.document.head.append(meta);
  }
  return dom;
}

const IPYNB_URL = "https://github.com/o/r/blob/main/a/nb.ipynb";

test("githubNotebookLink yields a public notebook's blob URL without query or hash", () => {
  installRepoPage(`${IPYNB_URL}?plain=1#L3`, "public");
  assert.equal(githubNotebookLink.sourceUrl(new URL(location.href)), IPYNB_URL);
});

test("githubNotebookLink skips private repos, and pages that do not say", () => {
  installRepoPage(IPYNB_URL, "private");
  assert.equal(githubNotebookLink.sourceUrl(new URL(location.href)), null);

  installRepoPage(IPYNB_URL, undefined);
  assert.equal(githubNotebookLink.sourceUrl(new URL(location.href)), null);
});

test("githubNotebookLink skips GitHub Enterprise, which molab cannot fetch", () => {
  installRepoPage("https://github.company.com/o/r/blob/main/nb.ipynb", "public");
  assert.equal(githubNotebookLink.sourceUrl(new URL(location.href)), null);
});
