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

const IPYNB_URL = "https://github.com/o/r/blob/main/a/nb.ipynb";

/** Answer repo checks from `statuses` (repo URL to HTTP status), recording each request. */
function stubRepos(statuses) {
  const requests = [];
  globalThis.fetch = async (input, init) => {
    requests.push({ url: String(input), method: init?.method, credentials: init?.credentials });
    const status = statuses[String(input)];
    if (status === undefined) throw new TypeError("Failed to fetch");
    return { ok: status >= 200 && status < 300, status };
  };
  return requests;
}

test("githubNotebookLink yields a notebook's blob URL without query or hash", () => {
  installDom();
  assert.equal(githubNotebookLink.sourceUrl(new URL(`${IPYNB_URL}?plain=1#L3`)), IPYNB_URL);
});

test("githubNotebookLink skips GitHub Enterprise, which molab cannot fetch", () => {
  installDom();
  assert.equal(
    githubNotebookLink.sourceUrl(new URL("https://github.company.com/o/r/blob/main/nb.ipynb")),
    null,
  );
});

test("githubNotebookLink checks the repo without the viewer's cookies", async () => {
  const requests = stubRepos({ "https://github.com/o/r": 200 });

  assert.equal(await githubNotebookLink.canImport(IPYNB_URL), true);
  assert.deepEqual(requests, [
    { url: "https://github.com/o/r", method: "HEAD", credentials: "omit" },
  ]);
});

test("githubNotebookLink refuses a repo that is private or gone", async () => {
  stubRepos({ "https://github.com/o/private": 404 });

  assert.equal(
    await githubNotebookLink.canImport("https://github.com/o/private/blob/main/nb.ipynb"),
    false,
  );
});

test("githubNotebookLink checks each repo once, but retries a failed check", async () => {
  stubRepos({});
  const flaky = "https://github.com/o/flaky/blob/main/nb.ipynb";
  await assert.rejects(githubNotebookLink.canImport(flaky));

  const requests = stubRepos({ "https://github.com/o/flaky": 200 });
  assert.equal(await githubNotebookLink.canImport(flaky), true);
  assert.equal(
    await githubNotebookLink.canImport("https://github.com/o/flaky/blob/main/other.ipynb"),
    true,
  );
  assert.equal(requests.length, 1);
});

test("githubNotebookLink does not take a rate limit or outage for a private repo", async () => {
  const busy = "https://github.com/o/busy/blob/main/nb.ipynb";
  stubRepos({ "https://github.com/o/busy": 429 });
  await assert.rejects(githubNotebookLink.canImport(busy), /429/);

  stubRepos({ "https://github.com/o/busy": 200 });
  assert.equal(await githubNotebookLink.canImport(busy), true);
});
