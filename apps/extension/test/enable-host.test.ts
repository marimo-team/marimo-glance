import { beforeEach, describe, expect, it, type MockInstance, vi } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import { disableOrigin, enableKnownSite, enableSelfHosted } from "@/entrypoints/popup/enable-host";
import { grantOrigins } from "./browser-stubs";

const SELF_HOSTED = "https://git.example.com";
const stored = async () => (await fakeBrowser.storage.local.get("enabledHosts")).enabledHosts;

let request: MockInstance<typeof fakeBrowser.permissions.request>;

beforeEach(() => {
  fakeBrowser.reset();
  vi.restoreAllMocks();
  grantOrigins();
  request = vi.spyOn(fakeBrowser.permissions, "request").mockResolvedValue(true);
});

// Firefox drops a permission request made after an `await` in the click handler.
describe("requesting inside the click", () => {
  it("enableKnownSite requests before awaiting anything", async () => {
    const done = enableKnownSite("https://colab.research.google.com");
    expect(request).toHaveBeenCalledWith({ origins: ["https://colab.research.google.com/*"] });
    await done;
  });

  it("enableSelfHosted requests before awaiting anything", async () => {
    const done = enableSelfHosted(SELF_HOSTED, "gitlab");
    expect(request).toHaveBeenCalledWith({ origins: [`${SELF_HOSTED}/*`] });
    await done;
  });
});

describe("enableSelfHosted", () => {
  it("stores the platform when the user grants", async () => {
    await enableSelfHosted(SELF_HOSTED, "gitlab");

    expect(await stored()).toEqual({ [SELF_HOSTED]: "gitlab" });
  });

  it("forgets the platform when the user declines", async () => {
    request.mockResolvedValue(false);

    await enableSelfHosted(SELF_HOSTED, "gitlab");

    expect(await stored()).toEqual({});
  });
});

describe("disableOrigin", () => {
  it("forgets the platform and drops the permission", async () => {
    await fakeBrowser.storage.local.set({ enabledHosts: { [SELF_HOSTED]: "github" } });
    const removed = vi.spyOn(fakeBrowser.permissions, "remove").mockResolvedValue(true);

    await disableOrigin(SELF_HOSTED);

    expect(removed).toHaveBeenCalledWith({ origins: [`${SELF_HOSTED}/*`] });
    expect(await stored()).toEqual({});
  });
});
