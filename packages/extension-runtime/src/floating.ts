import { className, EXT_CSS_CLASS_PREFIX } from "@marimo/notebook-core";

const FLOATING_STYLE_ID = `${EXT_CSS_CLASS_PREFIX}-floating-styles`;

/**
 * Inject a stylesheet once per page. Content scripts share the host's document,
 * so an id guard keeps re-mounting across navigations cheap.
 */
export function injectStyles(id: string, css: string): void {
  if (document.getElementById(id)) return;
  const style = document.createElement("style");
  style.id = id;
  style.textContent = css;
  document.head.append(style);
}

/**
 * Mount a container in the bottom-right corner, where the runtime's floating UI
 * (the switcher, the link-out pill) lives. `name` adds the component's own class.
 */
export function mountFloatingRoot(name: string): HTMLDivElement {
  injectStyles(FLOATING_STYLE_ID, FLOATING_CSS);
  const root = document.createElement("div");
  root.className = `${className("floating")} ${className(name)}`;
  document.body.append(root);
  return root;
}

const FLOATING_CSS = `
.${EXT_CSS_CLASS_PREFIX}-floating {
	position: fixed;
	right: 16px;
	bottom: 16px;
	z-index: 2147483000;
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	gap: 6px;
	font: 500 13px/1.4 system-ui, sans-serif;
}
`;
