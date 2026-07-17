import type { Host } from "@marimo/notebook-core";
import { findBlobAnchor, readGitLabTheme } from "./dom.js";
import { blobRawUrl, isBlobUrl } from "./urls.js";

async function fetchText(rawUrl: string): Promise<string | null> {
	try {
		const response = await fetch(rawUrl);
		return response.ok ? await response.text() : null;
	} catch {
		return null;
	}
}

/**
 * A `Host` for gitlab.com file views. Source is derived from the URL by swapping
 * the `/-/blob/` route for `/-/raw/`, so no DOM read is needed to fetch it. The
 * runtime supplies the floating switcher, so the anchor is simply the code
 * element to insert before and hide.
 */
export const gitlabHost: Host = {
	id: "gitlab",

	matches(url) {
		return isBlobUrl(url);
	},

	getSource(url) {
		return isBlobUrl(url) ? fetchText(blobRawUrl(url)) : Promise.resolve(null);
	},

	findAnchor() {
		const url = new URL(window.location.href);
		return isBlobUrl(url) ? findBlobAnchor(document) : null;
	},

	readTheme() {
		return readGitLabTheme(document);
	},
};
