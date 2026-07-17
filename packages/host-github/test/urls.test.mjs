import assert from "node:assert/strict";
import test from "node:test";

import { blobRawUrl, isBlobUrl, isGistUrl } from "../dist/index.js";

test("isBlobUrl accepts a github.com .py blob view", () => {
	assert.equal(
		isBlobUrl(new URL("https://github.com/o/r/blob/main/nb.py")),
		true,
	);
});

test("isBlobUrl rejects non-Python blobs", () => {
	assert.equal(
		isBlobUrl(new URL("https://github.com/o/r/blob/main/readme.md")),
		false,
	);
});

test("isBlobUrl rejects tree and non-blob paths", () => {
	assert.equal(
		isBlobUrl(new URL("https://github.com/o/r/tree/main/pkg")),
		false,
	);
});

test("isBlobUrl rejects other hosts, including gist and raw", () => {
	assert.equal(isBlobUrl(new URL("https://gitlab.com/o/r/blob/main/nb.py")), false);
	assert.equal(
		isBlobUrl(new URL("https://gist.github.com/o/abc123/blob/main/nb.py")),
		false,
	);
});

test("blobRawUrl swaps /blob/ for /raw/ and keeps the origin", () => {
	assert.equal(
		blobRawUrl(new URL("https://github.com/o/r/blob/main/dir/nb.py")),
		"https://github.com/o/r/raw/main/dir/nb.py",
	);
});

test("isGistUrl accepts a gist detail page and rejects the gist home", () => {
	assert.equal(isGistUrl(new URL("https://gist.github.com/o/abc123")), true);
	assert.equal(isGistUrl(new URL("https://gist.github.com/abc123")), true);
	assert.equal(isGistUrl(new URL("https://gist.github.com/")), false);
});

test("isGistUrl rejects github.com and other hosts", () => {
	assert.equal(isGistUrl(new URL("https://github.com/o/r")), false);
});
