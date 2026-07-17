import assert from "node:assert/strict";
import test from "node:test";

import { gitlabHost } from "../dist/index.js";
import { installDom, seedBlobPage, stubFetch } from "./dom.mjs";

const MARIMO = "import marimo\n\napp = marimo.App()\n";

test("matches gitlab.com blob .py views, nothing else", () => {
	assert.equal(
		gitlabHost.matches(new URL("https://gitlab.com/g/sg/r/-/blob/main/nb.py")),
		true,
	);
	assert.equal(
		gitlabHost.matches(new URL("https://gitlab.com/o/r/-/blob/main/x.md")),
		false,
	);
	assert.equal(gitlabHost.matches(new URL("https://gitlab.com/o/r")), false);
	assert.equal(
		gitlabHost.matches(new URL("https://github.com/o/r/blob/main/nb.py")),
		false,
	);
});

test("findAnchor returns the code viewer, leaving the file header outside it", () => {
	const dom = installDom();
	const { header, viewer } = seedBlobPage(dom);
	const anchor = gitlabHost.findAnchor();
	assert.equal(anchor, viewer);
	assert.equal(anchor.contains(header), false);
});

test("findAnchor returns null before the code area renders", () => {
	installDom();
	assert.equal(gitlabHost.findAnchor(), null);
});

test("getSource fetches the raw URL derived from the blob path", async () => {
	installDom("https://gitlab.com/g/sg/r/-/blob/main/dir/nb.py?ref_type=heads");
	const calls = stubFetch(MARIMO);
	const source = await gitlabHost.getSource(new URL(globalThis.location.href));
	assert.equal(source, MARIMO);
	assert.deepEqual(calls, ["https://gitlab.com/g/sg/r/-/raw/main/dir/nb.py"]);
});

test("getSource returns null when the raw fetch is not ok", async () => {
	installDom();
	stubFetch("nope", { ok: false });
	assert.equal(
		await gitlabHost.getSource(new URL(globalThis.location.href)),
		null,
	);
});

test("readTheme maps GitLab's gl-* html class, defaulting to system", () => {
	const dom = installDom();
	const html = dom.window.document.documentElement;

	html.className = "gl-system ui-neutral";
	assert.equal(gitlabHost.readTheme(), "system");

	html.className = "gl-dark ui-indigo";
	assert.equal(gitlabHost.readTheme(), "dark");

	html.className = "gl-light ui-neutral";
	assert.equal(gitlabHost.readTheme(), "light");

	html.className = "";
	assert.equal(gitlabHost.readTheme(), "system");
});
