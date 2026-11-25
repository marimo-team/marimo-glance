import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import { forgetEnabledHostsFor, readEnabledOrigins } from "@/enabled-hosts";
import { grantOrigins } from "./browser-stubs";

beforeEach(() => {
  fakeBrowser.reset();
  vi.restoreAllMocks();
  grantOrigins();
});

describe("readEnabledOrigins", () => {
  it("ignores an instance without a grant but keeps it, since its prompt may be open", async () => {
    await fakeBrowser.storage.local.set({ enabledHosts: { "https://git.example.com": "gitlab" } });

    expect((await readEnabledOrigins()).selfHosted).toEqual({});
    expect(await fakeBrowser.storage.local.get("enabledHosts")).toEqual({
      enabledHosts: { "https://git.example.com": "gitlab" },
    });
  });
});

describe("forgetEnabledHostsFor", () => {
  it("forgets only the instances behind the given patterns", async () => {
    await fakeBrowser.storage.local.set({
      enabledHosts: { "https://a.example": "gitlab", "https://b.example": "github" },
    });

    await forgetEnabledHostsFor(["https://a.example/*", "https://colab.research.google.com/*"]);

    expect(await fakeBrowser.storage.local.get("enabledHosts")).toEqual({
      enabledHosts: { "https://b.example": "github" },
    });
  });
});
