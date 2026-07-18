/**
 * Fetch raw text from a URL, returning null on a non-OK response or a network
 * error so callers treat "unavailable" uniformly (and can retry).
 */
export async function fetchText(url: string): Promise<string | null> {
	try {
		const response = await fetch(url);
		return response.ok ? await response.text() : null;
	} catch {
		return null;
	}
}
