import assert from "node:assert/strict";
import test from "node:test";

import { createRuntime } from "../dist/index.js";
import { installDom, makeHost, seedCodePage } from "./dom.mjs";

function iframe() {
	return globalThis.document.querySelector("iframe");
}

function notebookContainer() {
	return globalThis.document.querySelector(".mv-notebook");
}

test("mounts the notebook and hides the original code", async () => {
	installDom();
	const { code } = seedCodePage();
	const runtime = createRuntime(makeHost());

	await runtime.syncNow();

	const frame = iframe();
	assert.ok(frame, "an iframe is injected");
	assert.equal(frame.src.startsWith("https://marimo.app"), true);
	assert.equal(code.style.display, "none", "original code is hidden");
	runtime.stop();
});

test("leaves non-marimo Python untouched", async () => {
	installDom();
	seedCodePage();
	const runtime = createRuntime(
		makeHost({ getSource: async () => "print('just a script')\n" }),
	);

	await runtime.syncNow();

	assert.equal(iframe(), null);
	runtime.stop();
});

test("does nothing when the host does not match the URL", async () => {
	installDom("https://github.com/o/r/blob/main/README.md");
	seedCodePage();
	const runtime = createRuntime(makeHost());

	await runtime.syncNow();

	assert.equal(iframe(), null);
	runtime.stop();
});

test("retries a later tick when the anchor is not ready yet", async () => {
	installDom();
	const runtime = createRuntime(makeHost()); // no code page seeded yet

	await runtime.syncNow();
	assert.equal(iframe(), null, "nothing to mount against");

	seedCodePage();
	await runtime.syncNow();
	assert.ok(iframe(), "mounts once the anchor appears");
	runtime.stop();
});

test("tears down the injection when the anchor leaves the DOM", async () => {
	installDom();
	const { code } = seedCodePage();
	const runtime = createRuntime(makeHost());

	await runtime.syncNow();
	assert.ok(iframe());

	code.remove(); // a same-page re-render detaches our injection point
	await runtime.syncNow();

	assert.equal(iframe(), null, "stale injection is cleaned up");
	runtime.stop();
});

test("toggle switches views and persists the choice", async () => {
	installDom();
	const { code } = seedCodePage();
	const runtime = createRuntime(makeHost());
	await runtime.syncNow();

	const [notebookButton, originalButton] =
		globalThis.document.querySelectorAll(".mv-toggle__button");
	originalButton.click();

	assert.equal(code.style.display, "", "original code is shown");
	assert.equal(notebookContainer().style.display, "none", "notebook is hidden");
	assert.equal(globalThis.sessionStorage.getItem("mv-view"), "original");

	notebookButton.click();
	assert.equal(globalThis.sessionStorage.getItem("mv-view"), "notebook");
	runtime.stop();
});

test("applies the persisted view on a fresh mount", async () => {
	installDom();
	globalThis.sessionStorage.setItem("mv-view", "original");
	const { code } = seedCodePage();
	const runtime = createRuntime(makeHost());

	await runtime.syncNow();

	assert.equal(code.style.display, "", "starts on the persisted original view");
	assert.equal(notebookContainer().style.display, "none");
	runtime.stop();
});

test("restores the original view when the iframe is CSP-blocked", async () => {
	installDom();
	const { code } = seedCodePage();
	const warnings = [];
	const realWarn = console.warn;
	console.warn = (message) => warnings.push(message);

	const runtime = createRuntime(makeHost());
	await runtime.syncNow();
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
	console.warn = realWarn;
	runtime.stop();
});

test("an in-flight sync after stop() does not mount", async () => {
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

	assert.equal(iframe(), null, "a stopped runtime never mounts");
});

test("observer ticks schedule a reconcile pass", async () => {
	installDom();
	seedCodePage();
	const scheduled = [];
	const runtime = createRuntime(makeHost(), {
		schedule: (callback) => scheduled.push(callback),
	});

	runtime.start(); // initial sync runs directly; observer wired to schedule
	globalThis.document.body.append(globalThis.document.createElement("div"));
	await Promise.resolve(); // let the MutationObserver callback fire

	assert.equal(scheduled.length >= 1, true, "a mutation scheduled a pass");
	runtime.stop();
});
