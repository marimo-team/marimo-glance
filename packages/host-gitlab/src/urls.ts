import { isPythonPath } from "@marimo/notebook-core";

/**
 * A GitLab file view for a Python file. GitLab routes carry a literal `/-/`
 * delimiter between the (possibly nested) project namespace and the route verb,
 * so a blob path looks like `/group/subgroup/project/-/blob/ref/path/to/file.py`.
 *
 * The hostname is deliberately not checked: self-hosted instances live on
 * arbitrary hostnames, and which origins may be touched at all is decided by the
 * extension's host permissions rather than by this predicate.
 */
export function isBlobUrl(url: URL): boolean {
  return url.pathname.includes("/-/blob/") && isPythonPath(url.pathname);
}

/**
 * Derive the raw-source URL for a blob view by swapping the `/-/blob/` route for
 * `/-/raw/`. The `/-/` delimiter is reserved, so it appears once and never inside
 * a namespace or filename; gitlab.com serves `/-/raw/` itself, keeping the fetch
 * on an already-permitted host. The query is preserved because `ref_type` is what
 * disambiguates a branch from a same-named tag — dropping it fetches the wrong ref.
 */
export function blobRawUrl(url: URL): string {
  return `${url.origin}${url.pathname.replace("/-/blob/", "/-/raw/")}${url.search}`;
}
