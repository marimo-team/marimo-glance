const DEFAULT_ALIAS = "marimo";

function stripStringsAndComments(source: string): string {
	let result = "";
	let quote: "'" | '"' | null = null;
	let isTripleQuoted = false;

	for (let index = 0; index < source.length; index += 1) {
		const character = source[index];

		if (quote) {
			if (
				isTripleQuoted &&
				source.slice(index, index + 3) === quote.repeat(3)
			) {
				result += "   ";
				index += 2;
				quote = null;
				isTripleQuoted = false;
				continue;
			}

			if (!isTripleQuoted && character === "\\") {
				result += " ";
				index += 1;
				if (index < source.length) {
					result += source[index] === "\n" ? "\n" : " ";
				}
				continue;
			}

			if (!isTripleQuoted && character === quote) {
				quote = null;
			}

			result += character === "\n" ? "\n" : " ";
			continue;
		}

		if (character === "#") {
			while (index < source.length && source[index] !== "\n") {
				result += " ";
				index += 1;
			}
			if (index < source.length) {
				result += "\n";
			}
			continue;
		}

		if (character === "'" || character === '"') {
			quote = character;
			isTripleQuoted = source.slice(index, index + 3) === character.repeat(3);
			result += isTripleQuoted ? "   " : " ";
			if (isTripleQuoted) {
				index += 2;
			}
			continue;
		}

		result += character;
	}

	return result;
}

export function isPythonPath(path: string): boolean {
	return path.endsWith(".py");
}

export function isMarimoNotebook(source: string): boolean {
	const aliases = new Set([DEFAULT_ALIAS]);
	const header = stripStringsAndComments(source.slice(0, 4096));

	for (const line of header.split(/\r?\n/)) {
		if (line.startsWith(" ") || line.startsWith("\t")) {
			continue;
		}

		const importMatch = line.match(/^import\s+marimo\s+as\s+([A-Za-z_]\w*)\s*$/);
		if (importMatch) {
			aliases.add(importMatch[1]);
			continue;
		}

		const appMatch = line.match(
			/^app\s*(?::\s*[^=]+)?\s*=\s*([A-Za-z_]\w*)\.App\(/,
		);
		if (appMatch && aliases.has(appMatch[1])) {
			return true;
		}
	}

	return false;
}
