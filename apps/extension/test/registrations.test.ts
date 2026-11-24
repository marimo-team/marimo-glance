import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import { readEnabledHosts } from "@/enabled-hosts";
import { syncRegistrations } from "@/registrations";
import { grantOrigins } from "./browser-stubs";

let registered: { id: string; matches?: string[] }[];

beforeEach(() => {
  fakeBrowser.reset();
  vi.restoreAllMocks();
  registered = [{ id: "enabled:https://stale.example/*" }, { id: "someone-else" }];
  vi.spyOn(fakeBrowser.scripting, "getRegisteredContentScripts").mockImplementation(
    async () => registered as never,
  );
  vi.spyOn(fakeBrowser.scripting, "unregisterContentScripts").mockImplementation(
    async ({ ids = [] } = {}) => {
      registered = registered.filter((script) => !ids.includes(script.id));
    },
  );
  vi.spyOn(fakeBrowser.scripting, "registerContentScripts").mockImplementation(async (scripts) => {
    registered.push(...scripts);
  });
});

const registeredMatches = () => registered.flatMap((script) => script.matches ?? []);

describe("syncRegistrations", () => {
  it("registers granted self-hosted instances and opt-in sites, replacing its own old entries", async () => {
    await fakeBrowser.storage.local.set({ enabledHosts: { "https://git.example.com": "gitlab" } });
    grantOrigins("https://git.example.com/*", "https://colab.research.google.com/*");

    await syncRegistrations();

    expect(registeredMatches().sort()).toEqual([
      "https://colab.research.google.com/*",
      "https://git.example.com/*",
    ]);
    expect(registered.map((script) => script.id)).toContain("someone-else");
    expect(registered.map((script) => script.id)).not.toContain("enabled:https://stale.example/*");
  });

  it("leaves out opt-in sites the user has not granted", async () => {
    grantOrigins();

    await syncRegistrations();

    expect(registeredMatches()).toEqual([]);
  });

  it("never registers a known site stored as a self-hosted instance", async () => {
    await fakeBrowser.storage.local.set({
      enabledHosts: {
        "https://github.com": "github",
        "https://colab.research.google.com": "github",
      },
    });
    grantOrigins("https://github.com/*", "https://colab.research.google.com/*");

    await syncRegistrations();

    expect(registeredMatches()).toEqual(["https://colab.research.google.com/*"]);
  });

  it("drops and prunes a self-hosted instance whose permission was revoked", async () => {
    await fakeBrowser.storage.local.set({ enabledHosts: { "https://git.example.com": "gitlab" } });
    grantOrigins();

    await syncRegistrations();

    expect(registeredMatches()).toEqual([]);
    expect(await readEnabledHosts()).toEqual({});
  });
});
