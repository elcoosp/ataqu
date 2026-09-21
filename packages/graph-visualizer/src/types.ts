/** Graph data model + analysis layer for @ataqu/graph-visualizer.

Designed to feel native in the Ataqu suite: plain TS types for the data,
a small analysis surface that mirrors the metrics a product team actually
cares about (degree, centrality, connectivity, components), and a thin
layout abstraction that can be backed by D3-force (organic) or a
hierarchical pass (clean for DAGs/org charts).
*/

export interface Vertex<T = unknown> {
	/** Stable identifier; used as the D3 node key and inspector key. */
	id: string;
	/** Optional application payload (label, color hint, metadata, etc.). */
	data?: T;
	/** Human label used by the inspector panel and hover cards. */
	label?: string;
}

export interface Edge<T = unknown> {
	/** Source vertex id. */
	source: string;
	/** Target vertex id. */
	target: string;
	/** Optional application payload (weight, label, relationship type, etc.). */
	data?: T;
	/** Human label. */
	label?: string;
	/** Whether the relationship is directed. Undirected by default. */
	directed?: boolean;
}

export type LayoutMode = "force" | "hierarchy";

export interface LayoutOptions {
	mode: LayoutMode;
	/** Number of physics ticks for the force pass. */
	forceTicks?: number;
	/** Higher = looser clusters; lower = tighter. */
	forceStrength?: number;
	/** Padding around the computed bounding box. */
	padding?: number;
	/** Re-center the graph after layout (default true). */
	center?: boolean;
	/** For hierarchy mode: assumed top-to-bottom unless reversed. */
	direction?: "top-down" | "left-right" | "bottom-up" | "right-left";
}

export interface VertexPosition {
	x: number;
	y: number;
	/** Velocity from the force simulation; useful for residual motion styling. */
	vx?: number;
	vy?: number;
}

export interface LayoutResult {
	/** Mapped by vertex id → final position. */
	positions: ReadonlyMap<string, VertexPosition>;
	/** Bounding box of the computed layout (pre-padding). */
	bounds: { width: number; height: number };
	/** Whether the graph was treated as a directed graph for layout purposes. */
	directed: boolean;
}

/** Config passed to the visualizer. */
export interface GraphVisualizerConfig {
	/**
	 * Pixel radius of vertices at default zoom. The renderer scales this with
	 * the current transform so a radius here is really a "home zoom" size.
	 */
	vertexRadius?: number;
	/** Base pixel length for edges at default zoom. */
	edgeWidth?: number;
	/** Radius of the droppable "add vertex here" target in force mode. */
	dropTargetRadius?: number;
}

/** Read-only projection of a graph useful for consumers that don't mutate. */
export interface GraphSnapshot<V = unknown, E = unknown> {
	vertices: ReadonlyArray<Vertex<V>>;
	edges: ReadonlyArray<Edge<E>>;
	directed: boolean;
}
