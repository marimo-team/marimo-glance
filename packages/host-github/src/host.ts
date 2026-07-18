import type { Host } from "@marimo/notebook-core";
import { fetchText } from "@marimo/notebook-core";
import {
	findBlobAnchor,
	findGistPythonFile,
	readGitHubTheme,
} from "./dom.js";
import { blobRawUrl, isBlobUrl, isGistUrl } from "./urls.js";

/**
 * A `Host` for github.com file views and gist.github.com pages. Blob source is
 * derived from the URL; gist source is read from the file's "Raw" link because
 * the gist URL does not name the file. Both surfaces share GitHub's theme
 * attribute, and the runtime supplies the floating switcher, so the anchor is
 * simply the code element to insert before and hide.
 */
export const githubHost: Host = {
	id: "github",

	matches(url) {
		return isBlobUrl(url) || isGistUrl(url);
	},

	getSource(url) {
		if (isBlobUrl(url)) return fetchText(blobRawUrl(url));
		const file = findGistPythonFile(document);
		return file ? fetchText(file.rawUrl) : Promise.resolve(null);
	},

	findAnchor() {
		const url = new URL(window.location.href);
		if (isBlobUrl(url)) return findBlobAnchor(document);
		if (isGistUrl(url)) return findGistPythonFile(document)?.anchor ?? null;
		return null;
	},

	readTheme() {
		return readGitHubTheme(document);
	},
};
