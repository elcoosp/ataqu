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
 * Global `g <letter>` navigation chords (brainstorm P2).
 *
 * One `useShortcut` per target keeps the engine's per-chord registry exact;
 * the key set comes from the shared GO_TO_TARGETS constant, so the help
 * overlay and the actual bindings can never drift. Uses the imperative
 * `navigate()` helper so the component can sit outside the router tree.
 *
 * The loop runs over a frozen module-level array, so hook order is stable
 * across renders — the standard "fixed-length loop" exemption.
 */
export function GlobalShortcuts() {
	const targets = useMemo(() => Object.entries(GO_TO_TARGETS), []);
	const go = useCallback((route: string) => navigate(route), []);
	// Every iteration body is the same hook in the same order.
	// biome-ignore lint/correctness/useHookAtTopLevel: fixed-length loop over module constant
	return targets.map(([letter, target]) => (
		<GoShortcut key={letter} letter={letter} target={target} onGo={go} />
	));
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
