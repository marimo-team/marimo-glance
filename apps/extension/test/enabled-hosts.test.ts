import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import {
  applyEnabledHostChanges,
  forgetEnabledHostsFor,
  readEnabledOrigins,
  sendEnabledHostChange,
} from "@/enabled-hosts";
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

describe("enabled-host changes", () => {
  const stored = async () => (await fakeBrowser.storage.local.get("enabledHosts")).enabledHosts;

  beforeEach(() => applyEnabledHostChanges());

  it("applies changes in the order they were sent", async () => {
    const origin = "https://git.example.com";
    void sendEnabledHostChange({ type: "save-enabled-host", origin, flavor: "gitlab" });
    await sendEnabledHostChange({ type: "forget-enabled-host", origin });

    expect(await stored()).toEqual({});
  });

  it("loses no write when a revocation lands alongside a save", async () => {
    await Promise.all([
      sendEnabledHostChange({
        type: "save-enabled-host",
        origin: "https://a.example",
        flavor: "gitlab",
      }),
      forgetEnabledHostsFor(["https://b.example/*"]),
      sendEnabledHostChange({
        type: "save-enabled-host",
        origin: "https://c.example",
        flavor: "github",
      }),
    ]);

    expect(await stored()).toEqual({
      "https://a.example": "gitlab",
      "https://c.example": "github",
    });
  });

  it("ignores a message that is not a well-formed change", async () => {
    await fakeBrowser.runtime.sendMessage({
      type: "save-enabled-host",
      origin: "https://git.example.com",
      flavor: "bitbucket",
    });

    expect(await stored()).toBeUndefined();
  });
});
