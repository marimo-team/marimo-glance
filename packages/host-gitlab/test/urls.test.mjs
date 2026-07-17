import assert from "node:assert/strict";
import test from "node:test";

import { blobRawUrl, isBlobUrl } from "../dist/index.js";

test("isBlobUrl accepts a gitlab.com .py blob view", () => {
	assert.equal(
		isBlobUrl(new URL("https://gitlab.com/o/r/-/blob/main/nb.py")),
		true,
	);
});

test("isBlobUrl accepts nested group/subgroup paths", () => {
	assert.equal(
		isBlobUrl(new URL("https://gitlab.com/g/sg/r/-/blob/main/src/nb.py")),
		true,
	);
});

test("isBlobUrl ignores a ref_type query and keeps matching on the path", () => {
	assert.equal(
		isBlobUrl(new URL("https://gitlab.com/o/r/-/blob/main/nb.py?ref_type=heads")),
		true,
	);
});

test("isBlobUrl rejects non-Python blobs", () => {
	assert.equal(
		isBlobUrl(new URL("https://gitlab.com/o/r/-/blob/main/readme.md")),
		false,
	);
});

test("isBlobUrl rejects tree and raw paths", () => {
	assert.equal(
		isBlobUrl(new URL("https://gitlab.com/o/r/-/tree/main/pkg")),
		false,
	);
	assert.equal(
		isBlobUrl(new URL("https://gitlab.com/o/r/-/raw/main/nb.py")),
		false,
	);
});

test("isBlobUrl rejects other hosts, including github blobs", () => {
	assert.equal(isBlobUrl(new URL("https://github.com/o/r/blob/main/nb.py")), false);
	assert.equal(
		isBlobUrl(new URL("https://gitlab.example.com/o/r/-/blob/main/nb.py")),
		false,
	);
});

test("blobRawUrl swaps /-/blob/ for /-/raw/ and keeps the origin", () => {
	assert.equal(
		blobRawUrl(new URL("https://gitlab.com/g/sg/r/-/blob/main/dir/nb.py")),
		"https://gitlab.com/g/sg/r/-/raw/main/dir/nb.py",
	);
});
