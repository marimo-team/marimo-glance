import assert from "node:assert/strict";
import test from "node:test";

import { installSwitcher } from "../dist/switcher.js";
import { installDom } from "./dom.mjs";

function button() {
	return globalThis.document.querySelector(".mv-switcher__button");
}

function fakeView() {
	const calls = { show: 0, hide: 0 };
	return {
		view: {
			show: () => calls.show++,
			hide: () => calls.hide++,
			dispose: () => {},
		},
		calls,
	};
}

test("clicking a blocked pill does not re-show the dead iframe or re-arm the notebook", () => {
	installDom();
	const { view, calls } = fakeView();
	const switcher = installSwitcher({ view, initialView: "original", autoCollapseMs: 0 });

	switcher.handleBlocked();
	const showsBeforeClick = calls.show;
	button().click();

	assert.equal(calls.show, showsBeforeClick, "no re-show while blocked");
	assert.equal(
		globalThis.sessionStorage.getItem("mv-view"),
		"original",
		"a blocked click must not persist the notebook choice",
	);
	switcher.dispose();
});
