import type { NotebookLink } from "@marimo/notebook-core";
import { isIpynbPath } from "@marimo/notebook-core";

const COLAB_HOST = "colab.research.google.com";

/** The route verb sits at a fixed depth: `/github/owner/repo/blob/ref/...`. */
const GITHUB_ROUTE = "github";
const BLOB_ROUTE_INDEX = 3;

/**
 * A Colab notebook backed by a public GitHub file. Drive-backed notebooks
 * (`/drive/<id>`) are skipped: they are private by default, so molab could not
 * fetch most of them and the offer would mostly dead-end. molab resolves the
 * Colab URL itself, so it is passed through untouched.
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
