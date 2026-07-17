import type { Host, Theme } from "@marimo/notebook-core";

/**
 * Resolve the theme to hand the playground: the host's reading of the page
 * theme when it can provide one, otherwise `system` so the playground follows
 * the viewer's OS preference.
 */
export function resolveTheme(host: Host): Theme {
	return host.readTheme?.() ?? "system";
}
