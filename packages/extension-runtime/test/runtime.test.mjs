import assert from "node:assert/strict";
import test from "node:test";

import { createRuntime } from "../dist/index.js";
import { installDom, makeHost, seedCodePage } from "./dom.mjs";

function iframes() {
	return globalThis.document.querySelectorAll("iframe");
}

function pill() {
	return globalThis.document.querySelector(".mv-switcher");
}

function pillButton() {
	return globalThis.document.querySelector(".mv-switcher__button");
}

function label() {
	return globalThis.document.querySelector(".mv-switcher__label")?.textContent;
}

test("on detection it stays on the original code and floats an opt-in pill", async () => {
	installDom();
	const { code } = seedCodePage();
	const runtime = createRuntime(makeHost());

	await runtime.syncNow();

	assert.equal(code.style.display, "", "original code is left visible");
	assert.equal(iframes().length, 0, "no iframe is mounted until the user opts in");
	assert.ok(pill(), "a floating switcher is shown");
	assert.match(label(), /interactive notebook/i);
	runtime.stop();
});

test("clicking the pill lazily mounts the notebook and flips the label", async () => {
	installDom();
	const { code } = seedCodePage();
	const runtime = createRuntime(makeHost());
	await runtime.syncNow();

	pillButton().click();

	assert.equal(iframes().length, 1, "the notebook iframe is mounted on click");
	assert.equal(code.style.display, "none", "original code is hidden");
	assert.equal(label(), "See original");
	assert.equal(globalThis.sessionStorage.getItem("mv-view"), "notebook");
	runtime.stop();
});

test("toggling back to original reuses the iframe instead of rebooting", async () => {
	installDom();
	const { code } = seedCodePage();
	const runtime = createRuntime(makeHost());
	await runtime.syncNow();

	pillButton().click(); // -> notebook
	pillButton().click(); // -> original

	assert.equal(code.style.display, "", "original code is shown again");
	assert.equal(iframes().length, 1, "the iframe is kept, only hidden");
	assert.match(label(), /interactive notebook/i);
	assert.equal(globalThis.sessionStorage.getItem("mv-view"), "original");
	runtime.stop();
});

test("a persisted notebook preference mounts straight into the notebook", async () => {
	installDom();
	globalThis.sessionStorage.setItem("mv-view", "notebook");
	const { code } = seedCodePage();
	const runtime = createRuntime(makeHost());

	await runtime.syncNow();

	assert.equal(iframes().length, 1, "notebook is mounted from the persisted choice");
	assert.equal(code.style.display, "none");
	assert.equal(label(), "See original");
	runtime.stop();
});

test("a CSP block restores the original view and reports it", async () => {
	installDom();
	const { code } = seedCodePage();
	const warnings = [];
	const realWarn = console.warn;
	console.warn = (message) => warnings.push(message);

	const runtime = createRuntime(makeHost());
	await runtime.syncNow();
	pillButton().click(); // opt in, mounting the iframe under a CSP guard
	assert.equal(code.style.display, "none");

	const violation = new globalThis.Event("securitypolicyviolation");
	Object.assign(violation, {
		blockedURI: "https://marimo.app/",
		effectiveDirective: "frame-src",
		violatedDirective: "frame-src",
	});
	globalThis.document.dispatchEvent(violation);

	assert.equal(code.style.display, "", "original view is restored");
	assert.equal(warnings.length, 1, "the failure is logged loudly");
	assert.equal(globalThis.sessionStorage.getItem("mv-view"), "original");
	console.warn = realWarn;
	runtime.stop();
});

test("leaves non-marimo Python untouched", async () => {
	installDom();
	seedCodePage();
	const runtime = createRuntime(
		makeHost({ getSource: async () => "print('just a script')\n" }),
	);

	await runtime.syncNow();

	assert.equal(pill(), null, "no switcher for a plain script");
	assert.equal(iframes().length, 0);
	runtime.stop();
});

test("does nothing when the host does not match the URL", async () => {
	installDom("https://github.com/o/r/blob/main/README.md");
	seedCodePage();
	const runtime = createRuntime(makeHost());

	await runtime.syncNow();

	assert.equal(pill(), null);
	runtime.stop();
});

test("retries a later tick when the anchor is not ready yet", async () => {
	installDom();
	const runtime = createRuntime(makeHost()); // no code page seeded yet

	await runtime.syncNow();
	assert.equal(pill(), null, "nothing to anchor against");

	seedCodePage();
	await runtime.syncNow();
	assert.ok(pill(), "the switcher appears once the anchor exists");
	runtime.stop();
});

test("tears down the injection when the anchor leaves the DOM", async () => {
	installDom();
	const { code } = seedCodePage();
	const runtime = createRuntime(makeHost());
	await runtime.syncNow();
	pillButton().click();
	assert.equal(iframes().length, 1);

	code.remove(); // a same-page re-render detaches our injection point
	await runtime.syncNow();

	assert.equal(pill(), null, "the switcher is removed");
	assert.equal(iframes().length, 0, "the notebook is removed");
	runtime.stop();
});

test("stop() removes the switcher and the notebook", async () => {
	installDom();
	const { code } = seedCodePage();
	const runtime = createRuntime(makeHost());
	await runtime.syncNow();
	pillButton().click();

	runtime.stop();

	assert.equal(pill(), null);
	assert.equal(iframes().length, 0);
	assert.equal(code.style.display, "", "original code is restored");
});

test("an in-flight sync after stop() does not inject", async () => {
	installDom();
	seedCodePage();
	let release;
	const gate = new Promise((resolve) => {
		release = resolve;
	});
	const runtime = createRuntime(
		makeHost({
			getSource: async () => {
				await gate;
				return "import marimo\n\napp = marimo.App()\n";
			},
		}),
	);

	const pending = runtime.syncNow();
	runtime.stop();
	release();
	await pending;

	assert.equal(pill(), null, "a stopped runtime never injects");
});

test("observer ticks schedule a reconcile pass", async () => {
	installDom();
	seedCodePage();
	const scheduled = [];
	const runtime = createRuntime(makeHost(), {
		schedule: (callback) => scheduled.push(callback),
	});

	runtime.start();
	globalThis.document.body.append(globalThis.document.createElement("div"));
	await Promise.resolve();

	assert.equal(scheduled.length >= 1, true, "a mutation scheduled a pass");
	runtime.stop();
});
