import { isPythonPath } from "@marimo/notebook-core";

const BLOB_HOST = "github.com";
const GIST_HOST = "gist.github.com";

/**
 * A GitHub file view for a Python file. Paths look like
 * `/owner/repo/blob/ref/path/to/file.py`; only these carry a single file whose
 * raw source can be derived from the URL alone.
 */
export function isBlobUrl(url: URL): boolean {
	return (
		url.hostname === BLOB_HOST &&
		url.pathname.includes("/blob/") &&
		isPythonPath(url.pathname)
	);
}

/**
 * Derive the raw-source URL for a blob view by swapping `/blob/` for `/raw/`.
 * `github.com` serves `/raw/` itself (redirecting to raw.githubusercontent.com),
 * so the fetch stays on an already-permitted host.
 */
export function blobRawUrl(url: URL): string {
	return `${url.origin}${url.pathname.replace("/blob/", "/raw/")}`;
}

/**
 * A gist detail page. Unlike a blob, the URL (`/owner/gistId` or `/gistId`)
 * carries no filename, so the file — and whether any file is Python — is
 * discovered from the DOM; this only gates the host to gist pages, not the gist
 * home or discovery routes.
 */
export function isGistUrl(url: URL): boolean {
	return url.hostname === GIST_HOST && url.pathname.length > 1;
}
