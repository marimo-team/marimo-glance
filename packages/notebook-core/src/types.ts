export type Theme = "light" | "dark" | "system";
export type View = "notebook" | "original";

export interface PlaygroundOptions {
	ref?: string;
	theme?: Theme;
}

export interface HostAnchor {
	mount: HTMLElement;
	toggleContainer: HTMLElement;
}

export interface Host {
	id: string;
	matches(url: URL): boolean;
	getSource(url: URL): Promise<string | null>;
	findAnchor(): HostAnchor | null;
}

export interface RenderOptions extends PlaygroundOptions {
	sourceUrl?: string;
}
