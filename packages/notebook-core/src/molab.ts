const MOLAB_ORIGIN = "https://molab.marimo.io";

/**
 * molab imports any public notebook URL appended to its origin
 * (`molab.marimo.io/https://github.com/...`), converting Jupyter notebooks to
 * marimo server-side, so the extension never converts anything itself.
 */
export function molabUrl(sourceUrl: string): string {
  return `${MOLAB_ORIGIN}/${sourceUrl}`;
}
