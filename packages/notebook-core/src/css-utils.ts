export const EXT_CSS_CLASS_PREFIX = "mv";

export function className(classes: string | string[]): string {
	const classArray = Array.isArray(classes) ? classes : [classes];

	return classArray.map((c) => `${EXT_CSS_CLASS_PREFIX}-${c}`).join(" ");
}
