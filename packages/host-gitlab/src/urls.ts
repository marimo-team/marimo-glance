import { isPythonPath } from "@marimo/notebook-core";

const BLOB_HOST = "gitlab.com";

/**
 * A GitLab file view for a Python file. GitLab routes carry a literal `/-/`
 * delimiter between the (possibly nested) project namespace and the route verb,
 * so a blob path looks like `/group/subgroup/project/-/blob/ref/path/to/file.py`.
 * Only these carry a single file whose raw source can be derived from the URL.
 */
export function isBlobUrl(url: URL): boolean {
	return (
		url.hostname === BLOB_HOST &&
		url.pathname.includes("/-/blob/") &&
		isPythonPath(url.pathname)
	);
}

/**
 * Derive the raw-source URL for a blob view by swapping the `/-/blob/` route for
 * `/-/raw/`. The `/-/` delimiter is reserved, so it appears once and never inside
 * a namespace or filename; gitlab.com serves `/-/raw/` itself, keeping the fetch
 * on an already-permitted host.
 */
export function blobRawUrl(url: URL): string {
	return `${url.origin}${url.pathname.replace("/-/blob/", "/-/raw/")}`;
}
