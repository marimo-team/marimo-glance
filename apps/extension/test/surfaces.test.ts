import { colabNotebookLink } from "@marimo/host-colab";
import { githubHost, githubNotebookLink } from "@marimo/host-github";
import { gitlabHost } from "@marimo/host-gitlab";
import { beforeEach, describe, expect, it } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import { resolvePage } from "@/surfaces";

const page = (url: string) => resolvePage(new URL(url));

beforeEach(() => {
  fakeBrowser.reset();
});

describe("resolvePage", () => {
  it("runs both the host and the molab link on github.com", async () => {
    expect(await page("https://github.com/o/r")).toEqual({
      surface: "github",
      config: { host: githubHost, link: githubNotebookLink },
    });
  });

  it("runs only a host on gists and gitlab.com", async () => {
    expect(await page("https://gist.github.com/o/abc")).toEqual({
      surface: "gist",
      config: { host: githubHost },
    });
    expect(await page("https://gitlab.com/o/r")).toEqual({
      surface: "gitlab",
      config: { host: gitlabHost },
    });
  });

  it("runs only the molab link on Colab", async () => {
    expect(await page("https://colab.research.google.com/")).toEqual({
      surface: "colab",
      config: { link: colabNotebookLink },
    });
  });

  it("gives a self-hosted instance its platform's host and no molab link", async () => {
    await fakeBrowser.storage.local.set({ enabledHosts: { "https://git.example.com": "github" } });

    expect(await page("https://git.example.com/o/r")).toEqual({
      surface: "github",
      config: { host: githubHost },
    });
  });

  it("runs nothing on an origin that is neither known nor enabled", async () => {
    expect(await page("https://example.com/")).toBeNull();
  });
});
