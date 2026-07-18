import { JSDOM } from "jsdom";

const GLOBAL_KEYS = ["window", "document", "HTMLElement", "URL", "fetch"];

/**
 * Install a fresh jsdom document into the globals the host reads (document,
 * window, URL). Returns the JSDOM instance; call once per test so state never
 * leaks between cases.
 */
export function installDom(
	url = "https://gitlab.com/o/r/-/blob/main/notebook.py",
) {
	const dom = new JSDOM("<!doctype html><html><body></body></html>", { url });
	for (const key of GLOBAL_KEYS) globalThis[key] = dom.window[key];
	globalThis.location = dom.window.location;
	return dom;
}

/**
 * Build a blob-view DOM mirroring gitlab.com: `.file-holder` holds the sticky
 * `.js-file-title` header (kept visible) and, as a sibling, the `.blob-viewer`
 * code container the host anchors to. Returns both so tests can assert the
 * header stays outside the anchor.
 */
export function seedBlobPage(dom) {
	const doc = dom.window.document;

	const holder = doc.createElement("div");
	holder.className = "file-holder";
	holder.id = "fileHolder";

	const header = doc.createElement("div");
	header.className = "js-file-title file-title-flex-parent";

	const viewer = doc.createElement("div");
	viewer.className = "blob-viewer js-syntax-highlight";
	const content = doc.createElement("div");
	content.className = "blob-content";
	const fileContent = doc.createElement("div");
	fileContent.dataset.testid = "blob-viewer-file-content";
	fileContent.className = "file-content code js-syntax-highlight";
	fileContent.innerHTML = '<pre><code><span class="line" id="LC1">x = 1</span></code></pre>';
	content.append(fileContent);
	viewer.append(content);

	holder.append(header, viewer);
	doc.body.append(holder);
	return { holder, header, viewer };
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
