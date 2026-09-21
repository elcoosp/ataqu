import { describe, expect, it } from "vitest";
import { computeMetrics, validateEdges } from "../src/analysis";
import type { Edge, GraphSnapshot, Vertex } from "../src/types";

const vertex = (id: string): Vertex => ({ id });

function snapshot(
	ids: string[],
	edges: Edge[],
	directed = false,
): GraphSnapshot {
	return { vertices: ids.map(vertex), edges, directed };
}

describe("validateEdges", () => {
	it("returns no problems for a well-formed edge set", () => {
		const problems = validateEdges(
			[vertex("a"), vertex("b")],
			[{ source: "a", target: "b" }],
		);
		expect(problems).toEqual([]);
	});

	it("flags unknown sources and targets", () => {
		const problems = validateEdges(
			[vertex("a")],
			[{ source: "ghost", target: "also-ghost" }],
		);
		expect(problems).toHaveLength(2);
		expect(problems.map((p) => p.problem)).toEqual([
			'unknown source "ghost"',
			'unknown target "also-ghost"',
		]);
	});

	it("flags self-loops", () => {
		const problems = validateEdges(
			[vertex("a")],
			[{ source: "a", target: "a" }],
		);
		expect(problems).toHaveLength(1);
		expect(problems[0].problem).toBe("self-loop");
	});
});

describe("computeMetrics — degree stats", () => {
	it("computes degree, distribution and average for a path", () => {
		const metrics = computeMetrics(
			snapshot(
				["a", "b", "c"],
				[
					{ source: "a", target: "b" },
					{ source: "b", target: "c" },
				],
			),
		);

		expect(metrics.degrees.degrees.get("a")).toBe(1);
		expect(metrics.degrees.degrees.get("b")).toBe(2);
		expect(metrics.degrees.degrees.get("c")).toBe(1);
		expect(metrics.degrees.min).toBe(1);
		expect(metrics.degrees.max).toBe(2);
		expect(metrics.degrees.average).toBeCloseTo(4 / 3);
		expect(metrics.degrees.distribution.get(1)).toBe(2);
		expect(metrics.degrees.distribution.get(2)).toBe(1);
		expect(metrics.degrees.isolatedFraction).toBe(0);
	});

	it("counts isolated vertices", () => {
		const metrics = computeMetrics(
			snapshot(["a", "b", "island"], [{ source: "a", target: "b" }]),
		);
		expect(metrics.degrees.degrees.get("island")).toBe(0);
		expect(metrics.degrees.isolatedFraction).toBeCloseTo(1 / 3);
	});

	it("treats a lone vertex as density 0 and connected", () => {
		const metrics = computeMetrics(snapshot(["only"], []));
		expect(metrics.density).toBe(0);
		expect(metrics.connectivity.componentCount).toBe(1);
		expect(metrics.connectivity.isConnected).toBe(true);
		expect(metrics.cycles.hasCycle).toBe(false);
	});
});

describe("computeMetrics — density and cycles", () => {
	it("reports density 1 for a complete graph", () => {
		const ids = ["a", "b", "c", "d", "e"];
		const edges: Edge[] = [];
		for (let i = 0; i < ids.length; i++) {
			for (let j = i + 1; j < ids.length; j++) {
				edges.push({ source: ids[i], target: ids[j] });
			}
		}
		expect(edges).toHaveLength(10);

		const metrics = computeMetrics(snapshot(ids, edges));
		expect(metrics.density).toBeCloseTo(1);
		expect(metrics.connectivity.isConnected).toBe(true);
		expect(metrics.cycles.hasCycle).toBe(true);
		// A connected graph on 5 vertices spans with 4 edges, so 10 - 4 = 6 redundant.
		expect(metrics.cycles.excessEdges).toBe(6);
	});

	it("treats a tree as cycle-free", () => {
		const metrics = computeMetrics(
			snapshot(
				["a", "b", "c", "d"],
				[
					{ source: "a", target: "b" },
					{ source: "a", target: "c" },
					{ source: "a", target: "d" },
				],
			),
		);
		expect(metrics.cycles.hasCycle).toBe(false);
		expect(metrics.cycles.excessEdges).toBe(0);
	});
});

describe("computeMetrics — connectivity", () => {
	it("counts disconnected components", () => {
		const metrics = computeMetrics(
			snapshot(
				["a", "b", "c", "d", "e"],
				[
					{ source: "a", target: "b" },
					{ source: "c", target: "d" },
				],
			),
		);
		expect(metrics.connectivity.componentCount).toBe(3);
		expect(metrics.connectivity.isConnected).toBe(false);
		expect(metrics.connectivity.componentSizes).toContain(2);
		expect(metrics.connectivity.componentOf.get("a")).toBe(
			metrics.connectivity.componentOf.get("b"),
		);
		expect(metrics.connectivity.componentOf.get("a")).not.toBe(
			metrics.connectivity.componentOf.get("c"),
		);
	});

	it("ignores edges that reference unknown vertices", () => {
		const metrics = computeMetrics(
			snapshot(["a", "b"], [{ source: "a", target: "who" }]),
		);
		expect(metrics.degrees.degrees.get("a")).toBe(0);
		expect(metrics.degrees.degrees.get("b")).toBe(0);
	});
});

describe("computeMetrics — centrality", () => {
	it("gives the path-centre the highest betweenness", () => {
		const metrics = computeMetrics(
			snapshot(
				["a", "b", "c"],
				[
					{ source: "a", target: "b" },
					{ source: "b", target: "c" },
				],
			),
		);
		const middle = metrics.centrality.betweenness.get("b") ?? 0;
		const end = metrics.centrality.betweenness.get("a") ?? 0;
		expect(middle).toBeGreaterThan(end);
		expect(metrics.centrality.betweennessNormalized.get("b")).toBeCloseTo(1);
	});

	it("normalises degree centrality into [0,1]", () => {
		const metrics = computeMetrics(
			snapshot(
				["hub", "x", "y", "z"],
				[
					{ source: "hub", target: "x" },
					{ source: "hub", target: "y" },
					{ source: "hub", target: "z" },
				],
			),
		);
		expect(metrics.centrality.degree.get("hub")).toBeCloseTo(1);
		expect(metrics.centrality.degree.get("x")).toBeCloseTo(1 / 3);
	});
});

describe("computeMetrics — path and clustering", () => {
	it("computes average path length across reachable pairs", () => {
		// a-b-c: (a,b)=1, (b,c)=1, (a,c)=2 → average 4/3
		const metrics = computeMetrics(
			snapshot(
				["a", "b", "c"],
				[
					{ source: "a", target: "b" },
					{ source: "b", target: "c" },
				],
			),
		);
		expect(metrics.averagePathLength).toBeCloseTo(4 / 3);
	});

	it("reports clustering 1 for a triangle", () => {
		const metrics = computeMetrics(
			snapshot(
				["a", "b", "c"],
				[
					{ source: "a", target: "b" },
					{ source: "b", target: "c" },
					{ source: "c", target: "a" },
				],
			),
		);
		expect(metrics.averageClustering).toBeCloseTo(1);
	});

	it("echoes the snapshot it was given", () => {
		const snap = snapshot(["a"], []);
		expect(computeMetrics(snap).snapshot).toBe(snap);
	});
});
