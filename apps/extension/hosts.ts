/**
 * The page origins Marimo Glance runs on. The content script matches these and
 * the manifest must request them; deriving both from this one list keeps the
 * content script and the manifest from drifting apart.
 */
export const PAGE_MATCHES = [
	"*://github.com/*",
	"*://gist.github.com/*",
	"*://gitlab.com/*",
];

/**
 * Extra origins fetched for raw blob source. github.com redirects `/raw/` to
 * these; gitlab.com serves `/-/raw/` same-origin, so it needs no extra host.
 */
const RAW_MATCHES = [
	"*://raw.githubusercontent.com/*",
	"*://gist.githubusercontent.com/*",
];

export const HOST_PERMISSIONS = [...PAGE_MATCHES, ...RAW_MATCHES];
