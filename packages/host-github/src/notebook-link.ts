import type { NotebookLink } from "@marimo/notebook-core";
import { blobRepoUrl, isIpynbBlobUrl } from "./urls.js";

const GITHUB_HOST = "github.com";

/** One check per repo for the page's lifetime; a failed check is retried. */
const publicRepos = new Map<string, Promise<boolean>>();

/**
 * A Jupyter notebook in a public github.com repository, which molab imports
 * straight from the blob URL. GitHub Enterprise and private repositories are
 * skipped: molab cannot fetch them, so the offer would only send their names
 * to molab for nothing.
 */
export const githubNotebookLink: NotebookLink = {
  sourceUrl(url) {
    return url.hostname === GITHUB_HOST && isIpynbBlobUrl(url)
      ? `${url.origin}${url.pathname}`
      : null;
  },

  canImport(sourceUrl) {
    const repo = blobRepoUrl(new URL(sourceUrl));
    let check = publicRepos.get(repo);
    if (!check) {
      check = isPublicRepo(repo);
      publicRepos.set(repo, check);
      check.catch(() => publicRepos.delete(repo));
    }
    return check;
  },
};

/**
 * Whether the repository loads without the viewer's session, which is exactly
 * what molab sees. The page cannot say: GitHub only renders its public-repo meta
 * tag for signed-out viewers.
 */
async function isPublicRepo(repo: string): Promise<boolean> {
  const response = await fetch(repo, { method: "HEAD", credentials: "omit" });
  return response.ok;
}
