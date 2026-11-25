import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import background from "@/entrypoints/background";
import { grantOrigins, permissionEvents } from "./browser-stubs";

const COLAB = "https://colab.research.google.com/*";
const SELF_HOSTED = "https://git.example.com";

let registered: { id: string; matches?: string[] }[];
let events: ReturnType<typeof permissionEvents>;

beforeEach(() => {
  fakeBrowser.reset();
  vi.restoreAllMocks();
  registered = [];
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
  events = permissionEvents();
});

const registeredMatches = () => registered.flatMap((script) => script.matches ?? []);

describe("background", () => {
  // Turning the extension off and on starts the background with no event of its own.
  it("registers what is already enabled as soon as it starts", async () => {
    grantOrigins(COLAB);

    background.main();

    await vi.waitFor(() => expect(registeredMatches()).toEqual([COLAB]));
  });

  it("forgets a self-hosted instance whose permission is revoked, and unregisters it", async () => {
    await fakeBrowser.storage.local.set({ enabledHosts: { [SELF_HOSTED]: "gitlab" } });
    grantOrigins(`${SELF_HOSTED}/*`);
    background.main();
    await vi.waitFor(() => expect(registeredMatches()).toEqual([`${SELF_HOSTED}/*`]));

    grantOrigins();
    events.removed({ origins: [`${SELF_HOSTED}/*`] });

    await vi.waitFor(async () => {
      expect(await fakeBrowser.storage.local.get("enabledHosts")).toEqual({ enabledHosts: {} });
      expect(registeredMatches()).toEqual([]);
    });
  });
});
