import { JSDOM } from "jsdom";

const GLOBAL_KEYS = ["window", "document", "HTMLElement", "URL", "fetch"];

/**
 * Install a fresh jsdom document into the globals the host reads (document,
 * window, URL). Returns the JSDOM instance; call once per test so state never
 * leaks between cases.
 */
export function installDom(url = "https://github.com/o/r/blob/main/notebook.py") {
	const dom = new JSDOM("<!doctype html><html><body></body></html>", { url });
	for (const key of GLOBAL_KEYS) globalThis[key] = dom.window[key];
	globalThis.location = dom.window.location;
	return dom;
}

/** Build the blob-view DOM: the code `<section>` the host anchors to. */
export function seedBlobPage(dom) {
	const doc = dom.window.document;
	const section = doc.createElement("section");
	const textarea = doc.createElement("textarea");
	textarea.id = "read-only-cursor-text-area";
	section.append(textarea);
	doc.body.append(section);
	return section;
}

/**
 * Build a gist-view DOM with one file. `rawUrl` is the file's "Raw" link href;
 * the code body is a `.blob-wrapper` the host anchors to.
 */
export function seedGistPage(dom, rawUrl) {
	const doc = dom.window.document;
	const file = doc.createElement("div");
	file.className = "file";
	const raw = doc.createElement("a");
	raw.href = rawUrl;
	raw.textContent = "Raw";
	const body = doc.createElement("div");
	body.className = "blob-wrapper";
	file.append(raw, body);
	doc.body.append(file);
	return { file, body };
}

/** Stub `fetch` to return `body` (or a non-ok response when `ok` is false). */
export function stubFetch(body, { ok = true } = {}) {
	const calls = [];
	globalThis.fetch = async (input) => {
		calls.push(String(input));
		return { ok, text: async () => body };
	};
	return calls;
}
