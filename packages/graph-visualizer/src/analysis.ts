/** Graph analysis surface — the metrics a product team actually wants.

Kept intentionally small and readable. Operations run on the public graph
model from `types.ts` so they compose with any renderer rather than being
tied to D3 or SVG.
*/

import type { Edge, GraphSnapshot, Vertex } from "./types";

export interface DegreeStats {
	/** Map of vertex id → degree (undirected count, or out+in for directed). */
	degrees: ReadonlyMap<string, number>;
	/** Degree distribution: degree → count of vertices at that degree. */
	distribution: ReadonlyMap<number, number>;
	min: number;
	max: number;
	average: number;
	/** Fraction of vertices with degree 0 (isolated). */
	isolatedFraction: number;
}

export interface CentralityStats {
	/** Simple degree centrality normalized to [0, 1]. */
	degree: ReadonlyMap<string, number>;
	/** Betweenness centrality approximation via BFS from every vertex.
	 *  O(V*(V+E)) — fine for the interactive sizes we target (< ~1k vertices). */
	betweenness: ReadonlyMap<string, number>;
	/** Brandes-normalized betweenness in [0,1]. */
	betweennessNormalized: ReadonlyMap<string, number>;
}

export interface ConnectivityStats {
	/** Whether the (undirected) underlying graph is connected. */
	isConnected: boolean;
	/** Number of connected components in the undirected view. */
	componentCount: number;
	/** Component id per vertex. */
	componentOf: ReadonlyMap<string, number>;
	/** Size (vertex count) of each component. */
	componentSizes: ReadonlyArray<number>;
}

export interface CycleInfo {
	/** Whether the undirected underlying graph contains at least one cycle. */
	hasCycle: boolean;
	/** Number of edges that can be removed without disconnecting the graph
	 *  (edges not in any spanning forest). For a connected graph this is
	 *  `|E| - (|V| - 1)`. */
	excessEdges: number;
}

export interface GraphMetrics<V = unknown, E = unknown> {
	snapshot: GraphSnapshot<V, E>;
	degrees: DegreeStats;
	centrality: CentralityStats;
	connectivity: ConnectivityStats;
	cycles: CycleInfo;
	/** Density = edges / (vertices*(vertices-1)/2) for undirected graphs. */
	density: number;
	/** Average shortest-path length across reachable pairs. */
	averagePathLength: number;
	/** Clustering coefficient (Watts-Strogatz), averaged over vertices. */
	averageClustering: number;
}

// ---------------------------------------------------------------------------

function undirectedDegree(
	adj: ReadonlyMap<string, Set<string>>,
	id: string,
): number {
	const neighbors = adj.get(id);
	return neighbors ? neighbors.size : 0;
}

function buildAdjacency(
	vertices: ReadonlyArray<Vertex>,
	edges: ReadonlyArray<Edge>,
	directed: boolean,
): {
	adj: Map<string, Set<string>>;
	adjDir: Map<string, { out: Set<string>; in: Set<string> }>;
} {
	const adj = new Map<string, Set<string>>();
	const adjDir = new Map<string, { out: Set<string>; in: Set<string> }>();
	for (const v of vertices) {
		adj.set(v.id, new Set());
		adjDir.set(v.id, { out: new Set(), in: new Set() });
	}
	for (const e of edges) {
		const a = adj.get(e.source);
		const b = adj.get(e.target);
		if (!a || !b) continue;
		if (!directed) {
			a.add(e.target);
			b.add(e.source);
		} else {
			a.add(e.target);
			adjDir.get(e.source)!.out.add(e.target);
			adjDir.get(e.target)!.in.add(e.source);
		}
	}
	return { adj, adjDir };
}

function degreeDistribution(
	degrees: ReadonlyMap<string, number>,
): Map<number, number> {
	const dist = new Map<number, number>();
	for (const d of degrees.values()) {
		dist.set(d, (dist.get(d) ?? 0) + 1);
	}
	return dist;
}

function averageOf(degrees: ReadonlyMap<string, number>): number {
	let sum = 0;
	let count = 0;
	for (const d of degrees.values()) {
		sum += d;
		count++;
	}
	return count === 0 ? 0 : sum / count;
}

// ---------------------------------------------------------------------------
// Connectivity + components (undirected BFS/DFS)
// ---------------------------------------------------------------------------

function components(
	vertices: ReadonlyArray<Vertex>,
	adj: ReadonlyMap<string, Set<string>>,
): {
	componentOf: Map<string, number>;
	sizes: number[];
} {
	const componentOf = new Map<string, number>();
	const sizes: number[] = [];
	let current = 0;
	const seen = new Set<string>();

	for (const v of vertices) {
		if (seen.has(v.id)) continue;
		const stack = [v.id];
		let size = 0;
		while (stack.length) {
			const id = stack.pop()!;
			if (seen.has(id)) continue;
			seen.add(id);
			componentOf.set(id, current);
			size++;
			for (const n of adj.get(id) ?? []) {
				if (!seen.has(n)) stack.push(n);
			}
		}
		sizes.push(size);
		current++;
	}
	return { componentOf, sizes };
}

// ---------------------------------------------------------------------------
// Betweenness (Brandes) — clean and readable, good for the sizes we target.
// ---------------------------------------------------------------------------

function brandesBetweenness(
	vertices: ReadonlyArray<Vertex>,
	adj: ReadonlyMap<string, Set<string>>,
): Map<string, number> {
	const cb = new Map<string, number>();
	for (const v of vertices) cb.set(v.id, 0);

	for (const s of vertices) {
		const stack: string[] = [];
		const predecessors = new Map<string, string[]>();
		const sigma = new Map<string, number>();
		const dist = new Map<string, number>();
		for (const v of vertices) sigma.set(v.id, 0);
		sigma.set(s.id, 1);
		dist.set(s.id, 0);

		const queue: string[] = [s.id];
		let qi = 0;
		while (qi < queue.length) {
			const v = queue[qi++];
			stack.push(v);
			const dv = dist.get(v)!;
			for (const w of adj.get(v) ?? []) {
				if (!dist.has(w)) {
					dist.set(w, dv + 1);
					queue.push(w);
				}
				if (dist.get(w) === dv + 1) {
					sigma.set(w, sigma.get(w)! + sigma.get(v)!);
					const preds = predecessors.get(w);
					if (preds) preds.push(v);
					else predecessors.set(w, [v]);
				}
			}
		}

		const delta = new Map<string, number>();
		for (const v of vertices) delta.set(v.id, 0);

		while (stack.length) {
			const w = stack.pop()!;
			// Brandes accumulation: delta[v] += (sigma[v]/sigma[w]) * (1 + delta[w]).
			// Dropping the "1 +" term makes every betweenness value zero.
			const coeff = (1 + delta.get(w)!) / sigma.get(w)!;
			for (const v of predecessors.get(w) ?? []) {
				delta.set(v, delta.get(v)! + sigma.get(v)! * coeff);
			}
			if (w !== s.id) {
				cb.set(w, cb.get(w)! + delta.get(w)!);
			}
		}
	}
	// Each undirected pair is traversed twice (s→t and t→s).
	for (const [id, v] of cb) cb.set(id, v / 2);
	return cb;
}

function averagePathLength(
	vertices: ReadonlyArray<Vertex>,
	adj: ReadonlyMap<string, Set<string>>,
): number {
	let total = 0;
	let pairs = 0;
	for (const s of vertices) {
		const dist = new Map<string, number>();
		const queue: string[] = [s.id];
		dist.set(s.id, 0);
		let qi = 0;
		while (qi < queue.length) {
			const v = queue[qi++];
			const dv = dist.get(v)!;
			for (const w of adj.get(v) ?? []) {
				if (!dist.has(w)) {
					dist.set(w, dv + 1);
					queue.push(w);
				}
			}
		}
		for (const [id, d] of dist) {
			if (id !== s.id) {
				total += d;
				pairs++;
			}
		}
	}
	return pairs === 0 ? 0 : total / pairs;
}

// ---------------------------------------------------------------------------
// Clustering coefficient (Watts-Strogatz) — undirected view.
// ---------------------------------------------------------------------------

function clusteringCoefficient(
	vertices: ReadonlyArray<Vertex>,
	adj: ReadonlyMap<string, Set<string>>,
): number {
	let sum = 0;
	let count = 0;
	for (const v of vertices) {
		const neighbors = Array.from(adj.get(v.id) ?? []);
		const k = neighbors.length;
		if (k < 2) {
			count++;
			continue;
		}
		let links = 0;
		for (let i = 0; i < neighbors.length; i++) {
			const ni = adj.get(neighbors[i]) ?? new Set();
			for (let j = i + 1; j < neighbors.length; j++) {
				if (ni.has(neighbors[j])) links++;
			}
		}
		sum += (2 * links) / (k * (k - 1));
		count++;
	}
	return count === 0 ? 0 : sum / count;
}

// ---------------------------------------------------------------------------
// Public surface
// ---------------------------------------------------------------------------

export function computeMetrics<V = unknown, E = unknown>(
	snapshot: GraphSnapshot<V, E>,
): GraphMetrics<V, E> {
	// Treat edges as undirected for structural metrics unless the graph is
	// explicitly undirected (directed graphs still get an undirected view for
	// connectivity/centrality, which is the common expectation).
	const { adj } = buildAdjacency(snapshot.vertices, snapshot.edges, false);
	const degrees = new Map<string, number>();
	for (const v of snapshot.vertices) {
		degrees.set(v.id, undirectedDegree(adj, v.id));
	}

	const dist = degreeDistribution(degrees);
	const avgDeg = averageOf(degrees);

	const isolated = snapshot.vertices.filter(
		(v) => (degrees.get(v.id) ?? 0) === 0,
	).length;
	const isolatedFraction =
		snapshot.vertices.length === 0 ? 0 : isolated / snapshot.vertices.length;

	const { componentOf, sizes: componentSizes } = components(
		snapshot.vertices,
		adj,
	);
	const componentCount = componentSizes.length;
	const isConnected = componentCount <= 1;

	const betweennessRaw = brandesBetweenness(snapshot.vertices, adj);
	const maxBetweenness = Math.max(1, ...betweennessRaw.values());
	const betweennessNormalized = new Map<string, number>();
	for (const [id, v] of betweennessRaw) {
		betweennessNormalized.set(id, v / maxBetweenness);
	}

	// Excess edges = edges - (vertices - components).
	const vertexCount = snapshot.vertices.length;
	const excessEdges = Math.max(
		0,
		snapshot.edges.length - (vertexCount - componentCount),
	);

	const density =
		vertexCount < 2
			? 0
			: (2 * snapshot.edges.length) / (vertexCount * (vertexCount - 1));

	const avgPath = averagePathLength(snapshot.vertices, adj);
	const avgClustering = clusteringCoefficient(snapshot.vertices, adj);

	return {
		snapshot,
		degrees: {
			degrees,
			distribution: dist,
			min: dist.size === 0 ? 0 : Math.min(...dist.keys()),
			max: dist.size === 0 ? 0 : Math.max(...dist.keys()),
			average: avgDeg,
			isolatedFraction,
		},
		centrality: {
			degree: new Map(
				[...degrees.entries()].map(([id, d]) => [
					id,
					vertexCount < 2 ? 0 : d / (vertexCount - 1),
				]),
			),
			betweenness: betweennessRaw,
			betweennessNormalized,
		},
		connectivity: {
			isConnected,
			componentCount,
			componentOf,
			componentSizes,
		},
		cycles: {
			hasCycle: excessEdges > 0,
			excessEdges,
		},
		density,
		averagePathLength: avgPath,
		averageClustering: avgClustering,
	};
}

/** Convenience: validate that every edge references a known vertex. */
export function validateEdges(
	vertices: ReadonlyArray<Vertex>,
	edges: ReadonlyArray<Edge>,
): ReadonlyArray<{ edge: Edge; problem: string }> {
	const known = new Set(vertices.map((v) => v.id));
	const problems: { edge: Edge; problem: string }[] = [];
	for (const e of edges) {
		if (!known.has(e.source))
			problems.push({ edge: e, problem: `unknown source "${e.source}"` });
		if (!known.has(e.target))
			problems.push({ edge: e, problem: `unknown target "${e.target}"` });
		if (e.source === e.target) problems.push({ edge: e, problem: "self-loop" });
	}
	return problems;
}
