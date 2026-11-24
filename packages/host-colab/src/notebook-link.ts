import type { NotebookLink } from "@marimo/notebook-core";
import { isIpynbPath } from "@marimo/notebook-core";

const COLAB_HOST = "colab.research.google.com";

/** The route verb sits at a fixed depth: `/github/owner/repo/blob/ref/...`. */
const GITHUB_ROUTE = "github";
const BLOB_ROUTE_INDEX = 3;

/**
 * A Colab notebook backed by a GitHub file. molab resolves the Colab URL itself,
 * so it is passed through untouched. Drive-backed notebooks (`/drive/<id>`) are
 * skipped: they are private by default, so the offer would mostly dead-end.
 * A private GitHub repo opened through Colab cannot be told apart from a public
 * one without a request, so the pill still shows there and molab's import fails.
 */
export const colabNotebookLink: NotebookLink = {
  id: "colab",

  sourceUrl(url) {
    if (url.hostname !== COLAB_HOST) return null;

    const segments = url.pathname.split("/").filter(Boolean);
    const isGithubBlob = segments[0] === GITHUB_ROUTE && segments[BLOB_ROUTE_INDEX] === "blob";
    if (!isGithubBlob || !isIpynbPath(url.pathname)) return null;

    return `${url.origin}${url.pathname}`;
  },
};
