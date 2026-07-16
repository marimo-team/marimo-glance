/**
 * Heuristics for recognising a marimo notebook from its Python source.
 *
 * A marimo notebook is a plain `.py` file, so recognition is content-based:
 * it imports `marimo` and constructs an `App`. Kept dependency-free so the
 * detection logic can be reused outside a browser (tests, other extensions).
 */

const MARIMO_IMPORT = /^\s*import\s+marimo\b/m;
const MARIMO_APP = /\bmarimo\s*\.\s*App\s*\(/;

/** True when the given Python source looks like a marimo notebook. */
export function isMarimoNotebook(source: string): boolean {
  return MARIMO_IMPORT.test(source) && MARIMO_APP.test(source);
}

/** True when a GitHub file path could be a marimo notebook by extension. */
export function isPythonPath(path: string): boolean {
  return path.endsWith('.py');
}
