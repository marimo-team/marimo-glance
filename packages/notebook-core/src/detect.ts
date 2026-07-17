const DEFAULT_ALIAS = "marimo";

export function isPythonPath(path: string): boolean {
	return path.endsWith(".py");
}

export function isMarimoNotebook(source: string): boolean {
	const import_marimo_as_regex = /^\s*import\s+marimo\s+as\s+(\w+)/m;

	const result = source.match(import_marimo_as_regex);

	const alias = result && result.length > 1 ? result[1] : DEFAULT_ALIAS;

	const app_regex = new RegExp(
		`^app\\s*(?::\\s*[^=]+)?\\s*=\\s*${alias}\\.App\\(`,
		"m",
	);

	return !!source.slice(0, 4096).match(app_regex);
}
