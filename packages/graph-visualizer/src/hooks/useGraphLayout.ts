import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { layoutGraph } from "../layout";
import type { Edge, LayoutOptions, Vertex } from "../types";

/**
 * Hook that runs the layout engine and keeps positions in sync with the
 * current graph + options.
 *
 * The layout is computed asynchronously (d3-force tick loop) so React can
 * paint a skeleton while the simulation warms up. The returned `positions`
 * map is empty until the layout resolves.
 */
export function useGraphLayout<V = unknown, E = unknown>(
	vertices: ReadonlyArray<Vertex<V>>,
	edges: ReadonlyArray<Edge<E>>,
	options: LayoutOptions = { mode: "force" },
): {
	positions: ReadonlyMap<
		string,
		{ x: number; y: number; vx?: number; vy?: number }
	>;
	bounds: { width: number; height: number };
	directed: boolean;
	loading: boolean;
	error: Error | null;
	recompute: () => void;
} {
	const [state, setState] = useState<{
		positions: ReadonlyMap<
			string,
			{ x: number; y: number; vx?: number; vy?: number }
		>;
		bounds: { width: number; height: number };
		directed: boolean;
		loading: boolean;
		error: Error | null;
	}>(() => ({
		positions: new Map(),
		bounds: { width: 0, height: 0 },
		directed: false,
		loading: true,
		error: null,
	}));

	const mountedRef = useRef(true);
	useEffect(() => {
		mountedRef.current = true;
		return () => {
			mountedRef.current = false;
		};
	}, []);

	const run = useCallback(async () => {
		setState((s) => ({ ...s, loading: true, error: null }));
		try {
			const result = await layoutGraph(vertices, edges, options);
			if (mountedRef.current) {
				setState({
					positions: result.positions,
					bounds: result.bounds,
					directed: result.directed,
					loading: false,
					error: null,
				});
			}
		} catch (err) {
			if (mountedRef.current) {
				setState((s) => ({
					...s,
					loading: false,
					error: err instanceof Error ? err : new Error(String(err)),
				}));
			}
		}
	}, [vertices, edges, options]);

	useEffect(() => {
		run();
	}, [run]);

	const recompute = useCallback(() => {
		run();
	}, [run]);

	return { ...state, recompute };
}

/**
 * Utility hook that converts a `Map<string, VertexPosition>` into an array
 * of objects suitable for passing to D3 or a custom renderer.
 */
export function useLayoutPoints(
	positions: ReadonlyMap<
		string,
		{ x: number; y: number; vx?: number; vy?: number }
	>,
): Array<{ id: string; x: number; y: number; vx?: number; vy?: number }> {
	return useMemo(
		() => Array.from(positions.entries(), ([id, p]) => ({ id, ...p })),
		[positions],
	);
}
