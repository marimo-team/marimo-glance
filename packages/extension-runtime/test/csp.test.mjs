import assert from "node:assert/strict";
import test from "node:test";

import { guardCsp } from "../dist/csp.js";
import { installDom } from "./dom.mjs";

function mountIframe() {
	const notebook = globalThis.document.createElement("div");
	const iframe = globalThis.document.createElement("iframe");
	notebook.append(iframe);
	globalThis.document.body.append(notebook);
	return notebook;
}

function dispatchViolation(fields) {
	const event = new globalThis.Event("securitypolicyviolation");
	Object.assign(event, fields);
	globalThis.document.dispatchEvent(event);
}

test("ignores a frame violation from an unrelated blocked origin", () => {
	installDom();
	let restored = false;
	const dispose = guardCsp(mountIframe(), () => {
		restored = true;
	}, 100000);

	dispatchViolation({
		blockedURI: "https://example.com/widget",
		effectiveDirective: "frame-src",
		violatedDirective: "frame-src",
	});

	assert.equal(restored, false, "an unrelated blocked frame must not restore");
	dispose();
});

test("ignores a non-frame violation whose URI merely contains the host string", () => {
	installDom();
	let restored = false;
	const dispose = guardCsp(mountIframe(), () => {
		restored = true;
	}, 100000);

	dispatchViolation({
		blockedURI: "https://marimo.app.attacker.com/pixel.png",
		effectiveDirective: "img-src",
		violatedDirective: "img-src",
	});

	assert.equal(restored, false, "a substring match on another directive must not restore");
	dispose();
});

test("restores on a genuine playground frame violation", () => {
	installDom();
	let restored = false;
	const dispose = guardCsp(mountIframe(), () => {
		restored = true;
	}, 100000);

	dispatchViolation({
		blockedURI: "https://marimo.app/",
		effectiveDirective: "frame-src",
		violatedDirective: "frame-src",
	});

	assert.equal(restored, true, "the playground frame being blocked must restore");
	dispose();
});
