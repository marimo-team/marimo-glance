import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import { readActiveTabSupport } from "@/entrypoints/popup/site-support";
import { activeTab, grantOrigins } from "./browser-stubs";

const COLAB = "https://colab.research.google.com/github/o/r/blob/main/nb.ipynb";

beforeEach(() => {
  fakeBrowser.reset();
  vi.restoreAllMocks();
  grantOrigins();
});

describe("readActiveTabSupport", () => {
  it("reports a built-in site with its hostname", async () => {
    activeTab("https://github.com/o/r/blob/main/nb.ipynb");

    expect(await readActiveTabSupport()).toEqual({
      kind: "built-in",
      surface: "github",
      hostname: "github.com",
    });
  });

  it("offers Colab until it is granted, then reports it enabled", async () => {
    activeTab(COLAB);
    expect(await readActiveTabSupport()).toEqual({
      kind: "opt-in",
      surface: "colab",
      origin: "https://colab.research.google.com",
      enabled: false,
      tabId: 7,
    });

    grantOrigins("https://colab.research.google.com/*");
    expect(await readActiveTabSupport()).toMatchObject({ kind: "opt-in", enabled: true });
  });

  it("reports an enabled self-hosted instance", async () => {
    await fakeBrowser.storage.local.set({ enabledHosts: { "https://git.example.com": "github" } });
    grantOrigins("https://git.example.com/*");
    activeTab("https://git.example.com/o/r");

    expect(await readActiveTabSupport()).toEqual({
      kind: "self-hosted",
      origin: "https://git.example.com",
      flavor: "github",
    });
  });

  it("offers to enable any other web origin", async () => {
    activeTab("https://example.com/page");

    expect(await readActiveTabSupport()).toEqual({
      kind: "unsupported",
      origin: "https://example.com",
      tabId: 7,
    });
  });

  it("offers nothing where no permission could be granted", async () => {
    activeTab("chrome://extensions/");
    expect(await readActiveTabSupport()).toEqual({
      kind: "unsupported",
      origin: null,
      tabId: null,
    });

    activeTab(undefined);
    expect(await readActiveTabSupport()).toEqual({
      kind: "unsupported",
      origin: null,
      tabId: null,
    });
  });
});
