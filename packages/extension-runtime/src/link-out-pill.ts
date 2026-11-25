import { className, EXT_CSS_CLASS_PREFIX } from "@marimo/notebook-core";
import { injectStyles, mountFloatingRoot } from "./floating.js";

const STYLE_ELEMENT_ID = `${EXT_CSS_CLASS_PREFIX}-link-out-styles`;
const MENU_ID = `${EXT_CSS_CLASS_PREFIX}-link-out-menu`;

export interface LinkOutPill {
  /** False once the page has removed the pill, e.g. by re-rendering `body`. */
  readonly isConnected: boolean;
  dispose(): void;
}

export interface LinkOutPillOptions {
  href: string;
  /** Named in the site-wide option, e.g. `github.com`. */
  site: string;
  onHideNotebook(): void;
  onHideSite(): void;
}

/**
 * Mount the floating "Open in molab" pill: a link that opens molab in a new tab,
 * and a toggle disclosing how much to hide. The options follow the pill in the
 * DOM, so they come next in tab order, and are drawn above it by CSS.
 */
export function mountLinkOutPill(options: LinkOutPillOptions): LinkOutPill {
  injectStyles(STYLE_ELEMENT_ID, LINK_OUT_CSS);
  const root = mountFloatingRoot("link-out");

  const link = document.createElement("a");
  link.className = className("link-out__link");
  link.href = options.href;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = "Open in molab";

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = className("link-out__toggle");
  toggle.textContent = "×";
  toggle.setAttribute("aria-label", "Hide the molab button");
  toggle.setAttribute("aria-controls", MENU_ID);
  toggle.setAttribute("aria-expanded", "false");

  const pill = document.createElement("div");
  pill.className = className("link-out__pill");
  pill.append(link, toggle);

  const hideNotebook = menuItem("Hide for this notebook", options.onHideNotebook);
  const menu = document.createElement("div");
  menu.id = MENU_ID;
  menu.className = className("link-out__menu");
  menu.hidden = true;
  menu.append(hideNotebook, menuItem(`Hide on all of ${options.site}`, options.onHideSite));

  root.append(pill, menu);

  let open = false;
  function setOpen(next: boolean): void {
    open = next;
    menu.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
  }

  toggle.addEventListener("click", () => {
    setOpen(!open);
    if (open) hideNotebook.focus();
  });
  root.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !open) return;
    setOpen(false);
    toggle.focus();
  });
  const closeOnOutsidePress = (event: PointerEvent) => {
    if (!root.contains(event.target as Node)) setOpen(false);
  };
  document.addEventListener("pointerdown", closeOnOutsidePress, true);

  return {
    get isConnected() {
      return root.isConnected;
    },
    dispose() {
      document.removeEventListener("pointerdown", closeOnOutsidePress, true);
      root.remove();
    },
  };
}

function menuItem(label: string, onSelect: () => void): HTMLButtonElement {
  const item = document.createElement("button");
  item.type = "button";
  item.className = className("link-out__item");
  item.textContent = label;
  item.addEventListener("click", onSelect);
  return item;
}

const LINK_OUT_CSS = `
.${EXT_CSS_CLASS_PREFIX}-floating.${EXT_CSS_CLASS_PREFIX}-link-out {
	flex-direction: column-reverse;
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
.${EXT_CSS_CLASS_PREFIX}-link-out__toggle {
	cursor: pointer;
	border: 0;
	padding: 0 12px 0 6px;
	background: transparent;
	color: #fff;
	font: inherit;
	opacity: 0.75;
}
.${EXT_CSS_CLASS_PREFIX}-link-out__toggle:hover,
.${EXT_CSS_CLASS_PREFIX}-link-out__toggle[aria-expanded="true"] {
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
/* Inset, because the rounded containers clip anything drawn outside them. */
.${EXT_CSS_CLASS_PREFIX}-link-out a:focus-visible,
.${EXT_CSS_CLASS_PREFIX}-link-out button:focus-visible {
	outline: 2px solid #fff;
	outline-offset: -3px;
}
`;
