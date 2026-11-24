import { className, EXT_CSS_CLASS_PREFIX } from "@marimo/notebook-core";

const STYLE_ELEMENT_ID = `${EXT_CSS_CLASS_PREFIX}-link-out-styles`;

/** How much a dismissal hides: just the notebook, or every notebook on the site. */
export type DismissalScope = "notebook" | "site";

export interface LinkOutPill {
  dispose(): void;
}

export interface LinkOutPillOptions {
  href: string;
  /** Shown in the site-wide option, e.g. `github.com`. */
  siteLabel: string;
  onDismiss(scope: DismissalScope): void;
}

/**
 * Mount the floating "Open in molab" pill: a link that opens molab in a new tab
 * and a dismiss button that asks how much to hide. It is plain DOM so it works
 * on any page, including SPAs like Colab, with no anchor element to find.
 */
export function mountLinkOutPill(options: LinkOutPillOptions): LinkOutPill {
  ensureStyles();

  const root = document.createElement("div");
  root.className = className("link-out");

  const menu = document.createElement("div");
  menu.className = className("link-out__menu");
  menu.hidden = true;
  menu.append(
    menuItem("Hide for this notebook", () => options.onDismiss("notebook")),
    menuItem(`Hide on all of ${options.siteLabel}`, () => options.onDismiss("site")),
  );

  const pill = document.createElement("div");
  pill.className = className("link-out__pill");

  const link = document.createElement("a");
  link.className = className("link-out__link");
  link.href = options.href;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = "Open in molab";

  const dismiss = document.createElement("button");
  dismiss.type = "button";
  dismiss.className = className("link-out__dismiss");
  dismiss.setAttribute("aria-label", "Dismiss");
  dismiss.setAttribute("aria-haspopup", "true");
  dismiss.setAttribute("aria-expanded", "false");
  dismiss.textContent = "×";
  dismiss.addEventListener("click", () => {
    menu.hidden = !menu.hidden;
    dismiss.setAttribute("aria-expanded", String(!menu.hidden));
  });

  pill.append(link, dismiss);
  root.append(menu, pill);
  document.body.append(root);

  return { dispose: () => root.remove() };
}

function menuItem(label: string, onSelect: () => void): HTMLButtonElement {
  const item = document.createElement("button");
  item.type = "button";
  item.className = className("link-out__item");
  item.textContent = label;
  item.addEventListener("click", onSelect);
  return item;
}

function ensureStyles(): void {
  if (document.getElementById(STYLE_ELEMENT_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ELEMENT_ID;
  style.textContent = LINK_OUT_CSS;
  document.head.append(style);
}

const LINK_OUT_CSS = `
.${EXT_CSS_CLASS_PREFIX}-link-out {
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
.${EXT_CSS_CLASS_PREFIX}-link-out__pill {
	display: flex;
	align-items: stretch;
	border: 1px solid rgba(0, 0, 0, 0.15);
	border-radius: 999px;
	overflow: hidden;
	background: #1a7f64;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}
.${EXT_CSS_CLASS_PREFIX}-link-out__link {
	padding: 8px 6px 8px 14px;
	color: #fff;
	text-decoration: none;
}
.${EXT_CSS_CLASS_PREFIX}-link-out__link:hover {
	text-decoration: underline;
}
.${EXT_CSS_CLASS_PREFIX}-link-out__dismiss {
	cursor: pointer;
	border: 0;
	padding: 0 12px 0 6px;
	background: transparent;
	color: #fff;
	font: inherit;
	opacity: 0.75;
}
.${EXT_CSS_CLASS_PREFIX}-link-out__dismiss:hover {
	opacity: 1;
}
.${EXT_CSS_CLASS_PREFIX}-link-out__menu {
	display: flex;
	flex-direction: column;
	overflow: hidden;
	border-radius: 8px;
	background: rgba(20, 20, 20, 0.95);
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}
.${EXT_CSS_CLASS_PREFIX}-link-out__menu[hidden] {
	display: none;
}
.${EXT_CSS_CLASS_PREFIX}-link-out__item {
	cursor: pointer;
	border: 0;
	padding: 8px 14px;
	background: transparent;
	color: #fff;
	font: inherit;
	text-align: left;
}
.${EXT_CSS_CLASS_PREFIX}-link-out__item:hover {
	background: rgba(255, 255, 255, 0.12);
}
`;
