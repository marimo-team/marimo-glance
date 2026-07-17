const PLAYGROUND_HOST = "marimo.app";
const DEFAULT_LOAD_TIMEOUT_MS = 8000;

/**
 * Guard against a host page whose Content-Security-Policy blocks the playground
 * iframe. Two failure modes are covered: the browser fires a
 * `securitypolicyviolation` for the frame, or the frame is silently refused and
 * simply never loads. Either one restores the original view and logs loudly so
 * the failure is visible rather than leaving the viewer with a blank frame.
 *
 * The guard settles exactly once — on successful load (no-op), on violation, or
 * on timeout — then detaches every listener. Returns a disposer for teardown
 * before it settles.
 */
export function guardCsp(
	notebook: HTMLElement,
	restore: () => void,
	timeoutMs: number = DEFAULT_LOAD_TIMEOUT_MS,
): () => void {
	const iframe = notebook.querySelector("iframe");
	if (!iframe) return () => {};

	let settled = false;

	const cleanup = () => {
		clearTimeout(timer);
		iframe.removeEventListener("load", onLoad);
		document.removeEventListener("securitypolicyviolation", onViolation);
	};

	const settle = (blockedReason?: string) => {
		if (settled) return;
		settled = true;
		cleanup();
		if (blockedReason) {
			console.warn(
				`[marimo-glance] playground iframe ${blockedReason}; restoring original view`,
			);
			restore();
		}
	};

	const onLoad = () => settle();
	const onViolation = (event: SecurityPolicyViolationEvent) => {
		if (isPlaygroundViolation(event)) settle("blocked by page CSP");
	};

	const timer = setTimeout(() => settle("failed to load"), timeoutMs);
	iframe.addEventListener("load", onLoad);
	document.addEventListener("securitypolicyviolation", onViolation);

	return () => {
		if (!settled) {
			settled = true;
			cleanup();
		}
	};
}

function isPlaygroundViolation(event: SecurityPolicyViolationEvent): boolean {
	const directive = event.effectiveDirective || event.violatedDirective;
	const framesBlocked =
		directive.includes("frame-src") || directive.includes("child-src");
	return framesBlocked || event.blockedURI.includes(PLAYGROUND_HOST);
}
