import type { HostAnchor, View } from "@marimo/notebook-core";
import { className } from "@marimo/notebook-core";
import type { FittableNotebook } from "./viewport.js";

const VIEW_STORAGE_KEY = "mv-view";

export interface Toggle {
	/** Switch the visible view and persist the choice. */
	show(view: View): void;
	/** Remove the toggle control from the page. */
	dispose(): void;
}

/**
 * Read the persisted view, defaulting to `notebook`. Persistence is
 * host-agnostic: one preference applies across every supported site.
 */
function savedView(): View {
	return sessionStorage.getItem(VIEW_STORAGE_KEY) === "original"
		? "original"
		: "notebook";
}

/**
 * Add a Notebook/Original switch to the host-provided container and wire it to
 * flip between the notebook and the page's original code. Toggling only changes
 * `display`, so nothing is removed from the host's DOM. The persisted view is
 * applied on mount without rewriting storage.
 */
export function installToggle(
	notebook: HTMLElement,
	anchor: HostAnchor,
): Toggle {
	const group = document.createElement("div");
	group.className = className("toggle");
	group.setAttribute("role", "group");
	group.setAttribute("aria-label", "marimo view");

	const notebookButton = buildButton("Notebook");
	const originalButton = buildButton("Original");
	group.append(notebookButton, originalButton);

	const apply = (view: View) => {
		const showNotebook = view === "notebook";
		notebook.style.display = showNotebook ? "" : "none";
		anchor.mount.style.display = showNotebook ? "none" : "";
		notebookButton.setAttribute("aria-pressed", String(showNotebook));
		originalButton.setAttribute("aria-pressed", String(!showNotebook));
		if (showNotebook) {
			// The notebook's top edge is only measurable once it is visible.
			requestAnimationFrame(() => (notebook as FittableNotebook).mvFit?.());
		}
	};

	const show = (view: View) => {
		apply(view);
		sessionStorage.setItem(VIEW_STORAGE_KEY, view);
	};

	notebookButton.addEventListener("click", () => show("notebook"));
	originalButton.addEventListener("click", () => show("original"));

	anchor.toggleContainer.append(group);
	apply(savedView());

	return { show, dispose: () => group.remove() };
}

function buildButton(label: string): HTMLButtonElement {
	const button = document.createElement("button");
	button.type = "button";
	button.className = className("toggle__button");
	button.textContent = label;
	return button;
}
