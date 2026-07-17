import { JSDOM } from "jsdom";

const GLOBAL_KEYS = [
	"window",
	"document",
	"MutationObserver",
	"requestAnimationFrame",
	"cancelAnimationFrame",
	"Node",
	"HTMLElement",
	"Event",
	"CustomEvent",
	"getComputedStyle",
	"URL",
];

/**
 * Install a fresh jsdom document into the globals the runtime reads (document,
 * window, MutationObserver, sessionStorage, …). Returns the JSDOM instance;
 * call once per test so state never leaks between cases.
 */
export function installDom(
	url = "https://github.com/o/r/blob/main/notebook.py",
) {
	const dom = new JSDOM("<!doctype html><html><body></body></html>", {
		url,
		pretendToBeVisual: true,
	});
	for (const key of GLOBAL_KEYS) globalThis[key] = dom.window[key];
	globalThis.location = dom.window.location;
	globalThis.sessionStorage = dom.window.sessionStorage;
	return dom;
}

/**
 * Build the DOM a well-formed host page exposes: a code element to replace and
 * a toolbar to host the toggle. Returns the two anchor elements.
 */
export function seedCodePage() {
	const code = globalThis.document.createElement("section");
	code.id = "code";
	code.textContent = "original source";
	const toolbar = globalThis.document.createElement("div");
	toolbar.id = "toolbar";
	globalThis.document.body.append(toolbar, code);
	return { code, toolbar };
}

/** A minimal Host stub whose behaviour each test tunes via overrides. */
export function makeHost(overrides = {}) {
	return {
		id: "test",
		matches: (url) => url.pathname.endsWith(".py"),
		getSource: async () => "import marimo\n\napp = marimo.App()\n",
		findAnchor: () => {
			const code = globalThis.document.querySelector("#code");
			const toggleContainer = globalThis.document.querySelector("#toolbar");
			return code && toggleContainer ? { mount: code, toggleContainer } : null;
		},
		...overrides,
	};
}
