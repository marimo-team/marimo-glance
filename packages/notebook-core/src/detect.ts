const DEFAULT_ALIAS = "marimo";

export function isPythonPath(path: string): boolean {
	return path.endsWith(".py");
}

export function isMarimoNotebook(source: string): boolean {
	// Anchor to the true line start (no leading whitespace) so an indented
	// `import marimo as mo` inside a cell body does not hijack the alias — a
	// notebook's top-level `import marimo` plus an in-cell aliased import is the
	// standard shape, and the app is declared with the top-level binding.
	const import_marimo_as_regex = /^import\s+marimo\s+as\s+(\w+)/m;

	const result = source.match(import_marimo_as_regex);

	const alias = result && result.length > 1 ? result[1] : DEFAULT_ALIAS;

	const app_regex = new RegExp(
		`^app\\s*(?::\\s*[^=]+)?\\s*=\\s*${alias}\\.App\\(`,
		"m",
	);

	return !!source.slice(0, 4096).match(app_regex);
}
