"use client";

import { GO_TO_TARGETS, useShortcut } from "@ataqu/shared-hooks";
import { useCallback, useMemo } from "react";
import { navigate } from "../lib/navigation";

/** g-letter target → in-app route (matches the sidebar's APP_HOME map). */
const GO_TO_ROUTES: Record<string, string> = {
	Dashboard: "/dashboard",
	CINQ: "/cinq/contacts",
	DIAL: "/dial",
	PIVOT: "/pivot",
	SPARK: "/spark",
	TEMPO: "/tempo/dashboard",
	SOND: "/sond",
	VAULT: "/vault/products",
	PAUSE: "/pause/directory",
	VISTA: "/vista",
};

/**
 * Per-app create targets for the global `c` shortcut (brainstorm P2-5,
 * "create-menu parity": `c` in any app opens that app's create dialog).
 * Values are the routes whose create dialogs are URL-driven (`?createOpen=1`
 * from the P1-3 pass) or dedicated create routes.
 */
const CREATE_ROUTES: Record<string, string> = {
	CINQ: "/cinq/contacts?createOpen=1",
	PIVOT: "/pivot/templates?createOpen=1",
	PAUSE: "/pause/directory?addOpen=1",
	USERS: "/users?createOpen=1",
	SPARK: "/spark/workflows/new",
};

/** Longest app-path prefix first, so `/cinq/contacts` matches before `/cinq`. */
const APP_PREFIXES: Array<[prefix: string, app: string]> = [
	["/cinq", "CINQ"],
	["/dial", "DIAL"],
	["/pivot", "PIVOT"],
	["/spark", "SPARK"],
	["/tempo", "TEMPO"],
	["/sond", "SOND"],
	["/vault", "VAULT"],
	["/pause", "PAUSE"],
	["/vista", "VISTA"],
	["/users", "USERS"],
	["/roles", "USERS"],
	["/api-keys", "USERS"],
	["/settings", "USERS"],
	["/admin", "USERS"],
];

/** Resolve the current app from a pathname (longest prefix wins). */
export function appForPath(pathname: string): string | undefined {
	return APP_PREFIXES.find(([prefix]) => pathname.startsWith(prefix))?.[1];
}

/**
 * Global keyboard shortcuts (brainstorm P2):
 *  - `g <letter>` navigation chords
 *  - `c` → open the current app's create dialog
 *
 * One `useShortcut` per binding keeps the engine's per-chord registry exact;
 * the `g` key set comes from the shared GO_TO_TARGETS constant, so the help
 * overlay and the actual bindings can never drift. Uses the imperative
 * `navigate()` helper so the component can sit outside the router tree.
 *
 * The loops run over frozen module-level arrays, so hook order is stable
 * across renders — the standard "fixed-length loop" exemption.
 */
export function GlobalShortcuts() {
	const targets = useMemo(() => Object.entries(GO_TO_TARGETS), []);
	const go = useCallback((route: string) => navigate(route), []);
	// Every iteration body is the same hook in the same order.
	// biome-ignore lint/correctness/useHookAtTopLevel: fixed-length loop over module constant
	return [
		...targets.map(([letter, target]) => (
			<GoShortcut key={letter} letter={letter} target={target} onGo={go} />
		)),
		<CreateShortcut key="create" />,
	];
}

function GoShortcut({
	letter,
	target,
	onGo,
}: {
	letter: string;
	target: string;
	onGo: (route: string) => void;
}) {
	const route = GO_TO_ROUTES[target];
	useShortcut(
		`g ${letter}`,
		useCallback(() => {
			if (route) onGo(route);
		}, [route, onGo]),
	);
	return null;
}

function CreateShortcut() {
	useShortcut(
		"c",
		useCallback(() => {
			const app = appForPath(window.location.pathname);
			const route = app ? CREATE_ROUTES[app] : undefined;
			// Apps without a URL-driven create dialog (dial, tempo, sond, vault,
			// vista) fall back to their home route — no silent no-op.
			if (route) navigate(route);
			else if (app) navigate(GO_TO_ROUTES[app]);
		}, []),
	);
	return null;
}
