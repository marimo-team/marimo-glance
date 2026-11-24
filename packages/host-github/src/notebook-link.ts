import type { NotebookLink } from "@marimo/notebook-core";
import { isPublicRepoPage } from "./dom.js";
import { isIpynbBlobUrl } from "./urls.js";

const GITHUB_HOST = "github.com";

/**
 * A Jupyter notebook in a public github.com repository, which molab imports
 * straight from the blob URL. GitHub Enterprise and private repositories are
 * skipped: molab cannot fetch them, so the offer would only send their names
 * to molab for nothing.
 */
export const githubNotebookLink: NotebookLink = {
  id: "github-ipynb",

  sourceUrl(url) {
    const importable =
      url.hostname === GITHUB_HOST && isIpynbBlobUrl(url) && isPublicRepoPage(document);
    return importable ? `${url.origin}${url.pathname}` : null;
  },
};
