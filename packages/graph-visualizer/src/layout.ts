/** Layout engine backed by d3-force.

Provides an organic, animated force-directed layout as the primary mode, plus
equough structure that a hierarchical pass can sit on top for DAGs/org charts.
The result is a plain `Map<vertexId, VertexPosition>` — renderer-agnostic.
*/

import type {
	Edge,
	LayoutOptions,
	LayoutResult,
	Vertex,
	VertexPosition,
} from "./types";

// ---------------------------------------------------------------------------
// D3-force adapter — tiny wrapper around d3-force so the rest of the package
// never imports d3 directly. This keeps the public API stable even if we swap
// the backend later.
// ---------------------------------------------------------------------------

type ForceSimulation = {
	nodes(): Array<{ id: string; x: number; y: number; vx: number; vy: number }>;
	force(name: string, f?: unknown): ForceSimulation;
	on(
		name: string,
		listener: (event: { alpha: number }) => void,
	): ForceSimulation;
	stop(): void;
	tick(): void;
	alpha(): number;
};

async function loadForce(): Promise<ForceSimulation | null> {
	try {
		// d3-force is small and tree-shakable; we only need the simulation + a few forces.
		const d3 = await import("d3-force");
		return d3.forceSimulation() as unknown as ForceSimulation;
	} catch {
		return null;
	}
}

// ---------------------------------------------------------------------------
// Public layout function
// ---------------------------------------------------------------------------

export async function layoutGraph(
	vertices: ReadonlyArray<Vertex>,
	edges: ReadonlyArray<Edge>,
	options: LayoutOptions = { mode: "force" },
): Promise<LayoutResult> {
	const ids = new Set(vertices.map((v) => v.id));
	const filteredEdges = edges.filter(
		(e) => ids.has(e.source) && ids.has(e.target),
	);

	if (vertices.length === 0) {
		return {
			positions: new Map(),
			bounds: { width: 0, height: 0 },
			directed: false,
		};
	}

	if (options.mode === "hierarchy") {
		return hierarchyLayout(vertices, filteredEdges, options);
	}

	const d3 = await import("d3-force");
	const sim = await loadForce();
	if (!sim) {
		// Fall back to a deterministic grid-ish layout if d3-force isn't installed.
		return fallbackLayout(vertices, filteredEdges, options);
	}

	const nodeMap = new Map<
		string,
		{ id: string; x: number; y: number; vx: number; vy: number }
	>();
	for (const v of vertices) {
		nodeMap.set(v.id, {
			id: v.id,
			// Spread initial positions in a circle so the simulation starts sensibly.
			x: 0,
			y: 0,
			vx: 0,
			vy: 0,
		});
	}

	const d3Nodes = Array.from(nodeMap.values());
	const d3Links = filteredEdges
		.map((e) => {
			const src = nodeMap.get(e.source);
			const tgt = nodeMap.get(e.target);
			return src && tgt ? { source: src, target: tgt } : null;
		})
		.filter(
			(
				l,
			): l is {
				source: { id: string; x: number; y: number; vx: number; vy: number };
				target: { id: string; x: number; y: number; vx: number; vy: number };
			} => l !== null,
		);

	let settled = false;
	const simulation = d3
		.forceSimulation(d3Nodes as any)
		.force(
			"link",
			d3.forceLink(d3Links as any).id((d: any) => d.id),
		)
		.force("charge", d3.forceManyBody().strength(-180))
		.force("center", d3.forceCenter(0, 0))
		.force("collision", d3.forceCollide(28))
		.alphaDecay(0.028)
		.on("end", () => {
			settled = true;
		});

	const ticks = options.forceTicks ?? 180;
	for (let i = 0; i < ticks; i++) {
		simulation.tick();
		if (settled) break;
	}
	simulation.stop();

	const positions = new Map<string, VertexPosition>();
	let minX = Infinity,
		minY = Infinity,
		maxX = -Infinity,
		maxY = -Infinity;
	for (const node of d3Nodes) {
		positions.set(node.id, { x: node.x, y: node.y, vx: node.vx, vy: node.vy });
		if (node.x < minX) minX = node.x;
		if (node.y < minY) minY = node.y;
		if (node.x > maxX) maxX = node.x;
		if (node.y > maxY) maxY = node.y;
	}

	const width = Math.max(1, maxX - minX);
	const height = Math.max(1, maxY - minY);
	return { positions, bounds: { width, height }, directed: false };
}

// ---------------------------------------------------------------------------
// Hierarchical fallback — simple layered layout for DAGs / org charts.
// ---------------------------------------------------------------------------

function hierarchyLayout(
	vertices: ReadonlyArray<Vertex>,
	edges: ReadonlyArray<Edge>,
	options: LayoutOptions,
): LayoutResult {
	// Build adjacency for layering.
	const outgoing = new Map<string, string[]>();
	const incoming = new Map<string, number>();
	for (const v of vertices) {
		outgoing.set(v.id, []);
		incoming.set(v.id, 0);
	}
	for (const e of edges) {
		outgoing.get(e.source)?.push(e.target);
		incoming.set(e.target, (incoming.get(e.target) ?? 0) + 1);
	}

	// Kahn layering: assign each vertex a layer by longest-path depth.
	const layer = new Map<string, number>();
	const queue: string[] = [];
	for (const [id, inDeg] of incoming) {
		if (inDeg === 0) {
			queue.push(id);
			layer.set(id, 0);
		}
	}

	const remaining = new Map(incoming);
	while (queue.length) {
		const id = queue.shift()!;
		const currentLayer = layer.get(id)!;
		for (const t of outgoing.get(id) ?? []) {
			const nextLayer = Math.max(layer.get(t) ?? 0, currentLayer + 1);
			layer.set(t, nextLayer);
			const nextIn = remaining.get(t)! - 1;
			remaining.set(t, nextIn);
			if (nextIn === 0) queue.push(t);
		}
	}

	// Assign vertices to layers.
	const byLayer = new Map<number, Array<Vertex>>();
	for (const v of vertices) {
		const l = layer.get(v.id) ?? 0;
		const bucket = byLayer.get(l);
		if (bucket) bucket.push(v);
		else byLayer.set(l, [v]);
	}
	// Walk 0..deepestLayer so sparse layer indexes still produce rows.
	const deepestLayer = byLayer.size === 0 ? -1 : Math.max(...byLayer.keys());
	const layers: Array<Array<Vertex>> = [];
	for (let i = 0; i <= deepestLayer; i++) {
		layers.push(byLayer.get(i) ?? []);
	}

	const padding = options.padding ?? 40;
	const nodeGap = 90;
	const layerHeight = 120;
	const direction = options.direction ?? "top-down";

	const positions = new Map<string, VertexPosition>();

	for (let li = 0; li < layers.length; li++) {
		const layerNodes = layers[li];
		const totalW = layerNodes.length * nodeGap;
		const startX = -totalW / 2 + nodeGap / 2;
		for (let ni = 0; ni < layerNodes.length; ni++) {
			const v = layerNodes[ni];
			let y: number;
			let x: number;
			if (direction === "top-down" || direction === "bottom-up") {
				y = li * layerHeight;
				x = startX + ni * nodeGap;
			} else {
				// left-right / right-left: swap axes.
				x = li * layerHeight;
				y = startX + ni * nodeGap;
			}
			if (direction === "bottom-up") y = -y;
			if (direction === "right-left") x = -x;
			positions.set(v.id, { x, y });
		}
	}

	let maxX = -Infinity,
		minX = Infinity,
		maxY = -Infinity,
		minY = Infinity;
	for (const { x, y } of positions.values()) {
		if (x < minX) minX = x;
		if (x > maxX) maxX = x;
		if (y < minY) minY = y;
		if (y > maxY) maxY = y;
	}
	const width = Math.max(1, maxX - minX) + padding * 2;
	const height = Math.max(1, maxY - minY) + padding * 2;

	return { positions, bounds: { width, height }, directed: true };
}

// ---------------------------------------------------------------------------
// Deterministic fallback when d3-force is unavailable.
// ---------------------------------------------------------------------------

function fallbackLayout(
	vertices: ReadonlyArray<Vertex>,
	_edges: ReadonlyArray<Edge>,
	options: LayoutOptions,
): LayoutResult {
	const n = vertices.length;
	const radius = Math.max(120, Math.sqrt(n) * 90);
	const positions = new Map<string, VertexPosition>();
	for (let i = 0; i < n; i++) {
		const angle = (2 * Math.PI * i) / n;
		positions.set(vertices[i].id, {
			x: Math.cos(angle) * radius,
			y: Math.sin(angle) * radius,
		});
	}
	const bounds = {
		width: radius * 2 + (options.padding ?? 40),
		height: radius * 2 + (options.padding ?? 40),
	};
	return { positions, bounds, directed: false };
}
