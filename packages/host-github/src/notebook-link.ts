import type { NotebookLink } from "@marimo/notebook-core";
import { isNotebookBlobUrl } from "./urls.js";

/** A Jupyter notebook on github.com, which molab imports straight from the blob URL. */
export const githubNotebookLink: NotebookLink = {
  id: "github-ipynb",

  sourceUrl(url) {
    return isNotebookBlobUrl(url) ? `${url.origin}${url.pathname}` : null;
  },
};
