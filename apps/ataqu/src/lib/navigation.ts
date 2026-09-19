import type { Router } from "@tanstack/react-router";

/**
 * Imperative router reference (P1 §5.2 — kill window.location).
 *
 * The command-palette action modules live outside of React component trees,
 * so they can't call `useNavigate()`. Instead they call `navigate()` here,
 * which delegates to the real TanStack Router instance when available and
 * falls back to `window.location.assign` only as a safety net (e.g. during
 * full-page loads before the router has been installed).
 */
let routerRef: Router<any> | null = null;

export function setRouterRef(router: Router<any>): void {
	routerRef = router;
}

/** Imperative navigate — prefers the SPA router, falls back to full-page nav. */
export function navigate(to: string): void {
	if (routerRef) {
		routerRef.navigate({ to });
	} else {
		window.location.assign(to);
	}
}
