import assert from "node:assert/strict";
import test from "node:test";

import { fitToViewport } from "../dist/viewport.js";
import { installDom } from "./dom.mjs";

function seedIframe(dom, rect, innerHeight = 800) {
	Object.defineProperty(dom.window, "innerHeight", {
		value: innerHeight,
		configurable: true,
	});
	const notebook = globalThis.document.createElement("div");
	const iframe = globalThis.document.createElement("iframe");
	iframe.getBoundingClientRect = () => rect;
	notebook.append(iframe);
	globalThis.document.body.append(notebook);
	return { notebook, iframe };
}

test("a hidden iframe (zero-height rect) is left unsized", () => {
	const dom = installDom();
	const { notebook, iframe } = seedIframe(dom, { top: 0, height: 0 });
	const fit = fitToViewport(notebook);
	assert.equal(iframe.style.height, "", "measuring while hidden is a no-op");
	fit.dispose();
});

test("an iframe scrolled above the viewport top still fills the viewport", () => {
	const dom = installDom();
	const { notebook, iframe } = seedIframe(dom, { top: -100, height: 500 });
	const fit = fitToViewport(notebook);
	assert.equal(iframe.style.height, "800px");
	fit.dispose();
});

test("a visible iframe at the top fills to the viewport bottom", () => {
	const dom = installDom();
	const { notebook, iframe } = seedIframe(dom, { top: 0, height: 500 });
	const fit = fitToViewport(notebook);
	assert.equal(iframe.style.height, "800px");
	fit.dispose();
});
