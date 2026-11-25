import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import { linkOutDismissals } from "@/link-out-dismissals";

const NOTEBOOK = "https://github.com/o/r/blob/main/a.ipynb";
const OTHER = "https://github.com/o/r/blob/main/b.ipynb";

beforeEach(() => {
  fakeBrowser.reset();
});

describe("linkOutDismissals", () => {
  it("hides one notebook without hiding its site", async () => {
    await linkOutDismissals.dismiss({ scope: "notebook", sourceUrl: NOTEBOOK });

    expect(await linkOutDismissals.isDismissed({ sourceUrl: NOTEBOOK, site: "github.com" })).toBe(
      true,
    );
    expect(await linkOutDismissals.isDismissed({ sourceUrl: OTHER, site: "github.com" })).toBe(
      false,
    );
  });

  it("hides every notebook on a site, and only that site", async () => {
    await linkOutDismissals.dismiss({ scope: "site", site: "github.com" });

    expect(await linkOutDismissals.isDismissed({ sourceUrl: OTHER, site: "github.com" })).toBe(
      true,
    );
    expect(
      await linkOutDismissals.isDismissed({
        sourceUrl: "https://colab.research.google.com/github/o/r/blob/main/a.ipynb",
        site: "colab.research.google.com",
      }),
    ).toBe(false);
  });

  it("keeps the 500 most recent entries and never duplicates one", async () => {
    const old = Array.from(
      { length: 500 },
      (_, index) => `https://github.com/o/r/blob/main/${index}.ipynb`,
    );
    await fakeBrowser.storage.local.set({ dismissedNotebooks: old });

    await linkOutDismissals.dismiss({ scope: "notebook", sourceUrl: NOTEBOOK });
    await linkOutDismissals.dismiss({ scope: "notebook", sourceUrl: NOTEBOOK });

    const { dismissedNotebooks } = await fakeBrowser.storage.local.get("dismissedNotebooks");
    expect(dismissedNotebooks).toHaveLength(500);
    expect(dismissedNotebooks).not.toContain(old[0]);
    expect((dismissedNotebooks as string[]).filter((url) => url === NOTEBOOK)).toHaveLength(1);
    expect((dismissedNotebooks as string[]).at(-1)).toBe(NOTEBOOK);
  });

  it("reads a malformed stored value as empty instead of throwing", async () => {
    await fakeBrowser.storage.local.set({
      dismissedSites: "github.com",
      dismissedNotebooks: [1, NOTEBOOK],
    });

    expect(await linkOutDismissals.isDismissed({ sourceUrl: OTHER, site: "github.com" })).toBe(
      false,
    );
    expect(await linkOutDismissals.isDismissed({ sourceUrl: NOTEBOOK, site: "x" })).toBe(true);
  });

  it("restores a hidden site", async () => {
    await linkOutDismissals.dismiss({ scope: "site", site: "github.com" });
    expect(await linkOutDismissals.isSiteDismissed("github.com")).toBe(true);

    await linkOutDismissals.restoreSite("github.com");

    expect(await linkOutDismissals.isSiteDismissed("github.com")).toBe(false);
  });

  it("reports dismissal changes until unsubscribed, ignoring unrelated keys", async () => {
    const onChange = vi.fn();
    const unsubscribe = linkOutDismissals.subscribe(onChange);

    await fakeBrowser.storage.local.set({ enabledHosts: {} });
    expect(onChange).not.toHaveBeenCalled();

    await linkOutDismissals.dismiss({ scope: "site", site: "github.com" });
    expect(onChange).toHaveBeenCalledTimes(1);

    unsubscribe();
    await linkOutDismissals.restoreSite("github.com");
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
