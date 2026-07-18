import { isPythonPath } from "@marimo/notebook-core";

const BLOB_HOST = "github.com";
const GIST_HOST = "gist.github.com";

/** The `blob` route verb sits at a fixed depth: `/owner/repo/blob/ref/...`. */
const BLOB_ROUTE_INDEX = 2;

function pathSegments(url: URL): string[] {
	return url.pathname.split("/").filter(Boolean);
}

/**
 * A GitHub file view for a Python file. Paths look like
 * `/owner/repo/blob/ref/path/to/file.py`; only these carry a single file whose
 * raw source can be derived from the URL alone. The route verb is matched by its
 * segment position so a repo literally named `blob` is not mistaken for one.
 */
export function isBlobUrl(url: URL): boolean {
	return (
		url.hostname === BLOB_HOST &&
		pathSegments(url)[BLOB_ROUTE_INDEX] === "blob" &&
		isPythonPath(url.pathname)
	);
}

/**
 * Derive the raw-source URL for a blob view by swapping the `blob` route segment
 * for `raw`. `github.com` serves `/raw/` itself (redirecting to
 * raw.githubusercontent.com), so the fetch stays on an already-permitted host.
 * Only the route segment is rewritten, so a `blob` repo name or a `blob`
 * directory in the file path survives.
 */
export function blobRawUrl(url: URL): string {
	const segments = pathSegments(url);
	segments[BLOB_ROUTE_INDEX] = "raw";
	return `${url.origin}/${segments.join("/")}`;
}

/**
 * A gist detail page. Unlike a blob, the URL (`/owner/gistId` or `/gistId`)
 * carries no filename, so the file — and whether any file is Python — is
 * discovered from the DOM. The id segment is hex, which excludes listing and
 * discovery routes (`/discover`, `/starred`, `/{user}`) that also render file
 * previews and would otherwise be injected into.
 */
export function isGistUrl(url: URL): boolean {
	if (url.hostname !== GIST_HOST) return false;
	const segments = pathSegments(url);
	if (segments.length < 1 || segments.length > 2) return false;
	return /^[0-9a-f]+$/i.test(segments[segments.length - 1]);
}
