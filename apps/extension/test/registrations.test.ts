import { beforeEach, describe, expect, it, type MockInstance, vi } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import { syncRegistrations } from "@/registrations";
import { grantOrigins } from "./browser-stubs";

const COLAB = "https://colab.research.google.com/*";

let registered: { id: string; matches?: string[] }[];
let execute: MockInstance<typeof fakeBrowser.scripting.executeScript>;

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
  vi.spyOn(fakeBrowser.tabs, "query").mockResolvedValue([]);
  execute = vi.spyOn(fakeBrowser.scripting, "executeScript").mockResolvedValue([]);
});

const injectedTabs = () => execute.mock.calls.map(([injection]) => injection.target.tabId);

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

  it("drops a self-hosted instance whose permission was revoked", async () => {
    await fakeBrowser.storage.local.set({ enabledHosts: { "https://git.example.com": "gitlab" } });
    grantOrigins();

    await syncRegistrations();

    expect(registeredMatches()).toEqual([]);
  });
});

describe("syncRegistrations in open tabs", () => {
  it("starts the script in open tabs of a newly registered origin, once", async () => {
    const query = vi
      .spyOn(fakeBrowser.tabs, "query")
      .mockResolvedValue([{ id: 3 }, { id: 9 }, {}] as never);
    grantOrigins(COLAB);

    await syncRegistrations();
    await syncRegistrations();

    expect(query).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith({ url: [COLAB] });
    expect(injectedTabs()).toEqual([3, 9]);
  });

  it("starts a self-hosted instance once its platform and its grant are both in", async () => {
    vi.spyOn(fakeBrowser.tabs, "query").mockResolvedValue([{ id: 4 }] as never);
    grantOrigins("https://git.example.com/*");

    await syncRegistrations();
    expect(injectedTabs()).toEqual([]);

    await fakeBrowser.storage.local.set({ enabledHosts: { "https://git.example.com": "gitlab" } });
    await syncRegistrations();
    expect(injectedTabs()).toEqual([4]);
  });
});

describe("syncRegistrations updates", () => {
  it("leaves an unchanged registration in place", async () => {
    grantOrigins(COLAB);
    await syncRegistrations();
    const unregister = vi.mocked(fakeBrowser.scripting.unregisterContentScripts);
    const register = vi.mocked(fakeBrowser.scripting.registerContentScripts);
    unregister.mockClear();
    register.mockClear();

    await syncRegistrations();

    expect(unregister).not.toHaveBeenCalled();
    expect(register).not.toHaveBeenCalled();
    expect(registeredMatches()).toEqual([COLAB]);
  });
});

describe("syncRegistrations ordering", () => {
  it("runs overlapping syncs one after another", async () => {
    grantOrigins(COLAB);
    const inFlight: number[] = [];
    let running = 0;
    vi.spyOn(fakeBrowser.scripting, "registerContentScripts").mockImplementation(async () => {
      running += 1;
      inFlight.push(running);
      await new Promise((resolve) => setTimeout(resolve, 5));
      running -= 1;
    });

    await Promise.all([syncRegistrations(), syncRegistrations(), syncRegistrations()]);

    expect(inFlight).toEqual([1, 1, 1]);
  });
});
