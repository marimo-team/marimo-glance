import { className, EXT_CSS_CLASS_PREFIX } from "@marimo/notebook-core";
import type { View } from "@marimo/notebook-core";
import type { NotebookView } from "./notebook-view.js";

const VIEW_STORAGE_KEY = "mv-view";
const STYLE_ELEMENT_ID = `${EXT_CSS_CLASS_PREFIX}-switcher-styles`;
const DEFAULT_AUTO_COLLAPSE_MS = 4000;

type Mode = "prompt" | "active" | "blocked";

export interface Switcher {
	/** React to the notebook being blocked: fall back to the original view. */
	handleBlocked(): void;
	/** Remove the switcher from the page. */
	dispose(): void;
}

export interface SwitcherOptions {
	view: NotebookView;
	initialView: View;
	/** How long the prompt stays expanded before collapsing. 0 disables it. */
	autoCollapseMs?: number;
}

/** Read the persisted view. Absent means original — the notebook is opt-in. */
export function savedView(): View {
	return sessionStorage.getItem(VIEW_STORAGE_KEY) === "notebook"
		? "notebook"
		: "original";
}

/**
 * Install the floating switcher: a fixed pill that announces a detected marimo
 * notebook and lets the viewer opt into the interactive view. It drives the
 * notebook view and persists the choice, so the page reopens in the last-chosen
 * view. On a CSP block it falls back to the original code and says so.
 */
export function installSwitcher(options: SwitcherOptions): Switcher {
	ensureStyles();

	const root = document.createElement("div");
	root.className = className("switcher");

	const button = document.createElement("button");
	button.type = "button";
	button.className = className("switcher__button");

	const labelText = document.createElement("span");
	labelText.className = className("switcher__label");
	button.append(labelText);

	const hint = document.createElement("span");
	hint.className = className("switcher__hint");
	hint.textContent = "marimo notebook detected · runs in your browser (WASM)";

	root.append(button, hint);
	document.body.append(root);

	let mode: Mode = "prompt";
	let collapseTimer: ReturnType<typeof setTimeout> | undefined;

	const render = () => {
		root.dataset.mode = mode;
		labelText.textContent =
			mode === "active"
				? "See original"
				: mode === "blocked"
					? "Couldn't load — blocked by this site"
					: "Switch to interactive notebook";
	};

	const setExpanded = (expanded: boolean) => {
		root.toggleAttribute("data-expanded", expanded);
		button.setAttribute("aria-expanded", String(expanded));
	};

	const persist = (view: View) => sessionStorage.setItem(VIEW_STORAGE_KEY, view);

	const activate = () => {
		mode = "active";
		options.view.show();
		persist("notebook");
		clearTimeout(collapseTimer);
		setExpanded(false);
		render();
	};

	const deactivate = () => {
		mode = "prompt";
		options.view.hide();
		persist("original");
		render();
	};

	button.addEventListener("click", () => {
		if (mode === "active") deactivate();
		else activate();
	});

	const expand = () => {
		if (mode !== "active") setExpanded(true);
	};
	const collapse = () => setExpanded(false);
	root.addEventListener("mouseenter", expand);
	root.addEventListener("mouseleave", collapse);
	button.addEventListener("focus", expand);
	button.addEventListener("blur", collapse);

	if (options.initialView === "notebook") {
		activate();
	} else {
		render();
		// Announce once on detection, then settle out of the way.
		setExpanded(true);
		const ms = options.autoCollapseMs ?? DEFAULT_AUTO_COLLAPSE_MS;
		if (ms > 0) {
			collapseTimer = setTimeout(() => {
				if (mode === "prompt") setExpanded(false);
			}, ms);
		}
	}

	return {
		handleBlocked() {
			mode = "blocked";
			options.view.hide();
			persist("original");
			setExpanded(true);
			render();
		},
		dispose() {
			clearTimeout(collapseTimer);
			root.remove();
		},
	};
}

/**
 * Inject the switcher stylesheet once per page. Content scripts share the
 * host's document, so an id guard keeps re-injection across navigations cheap.
 */
function ensureStyles(): void {
	if (document.getElementById(STYLE_ELEMENT_ID)) return;
	const style = document.createElement("style");
	style.id = STYLE_ELEMENT_ID;
	style.textContent = SWITCHER_CSS;
	document.head.append(style);
}

const SWITCHER_CSS = `
.${EXT_CSS_CLASS_PREFIX}-switcher {
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
.${EXT_CSS_CLASS_PREFIX}-switcher__button {
	cursor: pointer;
	border: 1px solid rgba(0, 0, 0, 0.15);
	border-radius: 999px;
	padding: 8px 14px;
	background: #1a7f64;
	color: #fff;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}
.${EXT_CSS_CLASS_PREFIX}-switcher__hint {
	max-width: 260px;
	padding: 6px 10px;
	border-radius: 8px;
	background: rgba(20, 20, 20, 0.9);
	color: #fff;
	opacity: 0;
	transform: translateY(4px);
	transition: opacity 150ms ease, transform 150ms ease;
	pointer-events: none;
}
.${EXT_CSS_CLASS_PREFIX}-switcher[data-expanded] .${EXT_CSS_CLASS_PREFIX}-switcher__hint {
	opacity: 1;
	transform: none;
}
.${EXT_CSS_CLASS_PREFIX}-switcher[data-mode="active"] .${EXT_CSS_CLASS_PREFIX}-switcher__hint,
.${EXT_CSS_CLASS_PREFIX}-switcher[data-mode="blocked"] .${EXT_CSS_CLASS_PREFIX}-switcher__hint {
	display: none;
}
.${EXT_CSS_CLASS_PREFIX}-switcher[data-mode="blocked"] .${EXT_CSS_CLASS_PREFIX}-switcher__button {
	background: #b23c3c;
}
@media (prefers-reduced-motion: reduce) {
	.${EXT_CSS_CLASS_PREFIX}-switcher__hint {
		transition: none;
	}
}
`;
