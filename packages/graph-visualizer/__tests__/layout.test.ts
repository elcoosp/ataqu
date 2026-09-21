import { describe, expect, it } from "vitest";
import { layoutGraph } from "../src/layout";
import type { Edge, Vertex } from "../src/types";

const chain: Vertex[] = [{ id: "a" }, { id: "b" }, { id: "c" }];
const chainEdges: Edge[] = [
	{ source: "a", target: "b" },
	{ source: "b", target: "c" },
];

describe("layoutGraph — force mode", () => {
	it("positions every vertex with finite coordinates", async () => {
		const result = await layoutGraph(chain, chainEdges, { mode: "force" });

		expect(result.positions.size).toBe(3);
		for (const id of ["a", "b", "c"]) {
			const pos = result.positions.get(id);
			expect(pos).toBeDefined();
			expect(Number.isFinite(pos?.x)).toBe(true);
			expect(Number.isFinite(pos?.y)).toBe(true);
		}
		expect(result.directed).toBe(false);
	});

	it("produces a non-degenerate bounding box", async () => {
		const result = await layoutGraph(chain, chainEdges, { mode: "force" });
		expect(result.bounds.width).toBeGreaterThan(0);
		expect(result.bounds.height).toBeGreaterThan(0);
	});

	it("honours forceTicks without throwing", async () => {
		const result = await layoutGraph(chain, chainEdges, {
			mode: "force",
			forceTicks: 5,
		});
		expect(result.positions.size).toBe(3);
	});

	it("returns an empty layout for an empty graph", async () => {
		const result = await layoutGraph([], [], { mode: "force" });
		expect(result.positions.size).toBe(0);
		expect(result.bounds).toEqual({ width: 0, height: 0 });
		expect(result.directed).toBe(false);
	});

	it("ignores edges whose endpoints are unknown", async () => {
		const result = await layoutGraph(
			chain,
			[{ source: "a", target: "ghost" }],
			{
				mode: "force",
			},
		);
		expect(result.positions.size).toBe(3);
	});

	it("handles isolated vertices", async () => {
		const result = await layoutGraph([...chain, { id: "lonely" }], chainEdges, {
			mode: "force",
		});
		expect(result.positions.size).toBe(4);
		expect(Number.isFinite(result.positions.get("lonely")?.x)).toBe(true);
	});
});

describe("layoutGraph — hierarchy mode", () => {
	it("layers a DAG and reports it as directed", async () => {
		const result = await layoutGraph(chain, chainEdges, { mode: "hierarchy" });

		expect(result.positions.size).toBe(3);
		expect(result.directed).toBe(true);
		// a → b → c should be placed on increasing layers (descending y).
		const a = result.positions.get("a");
		const b = result.positions.get("b");
		const c = result.positions.get("c");
		expect(a).toBeDefined();
		expect(b).toBeDefined();
		expect(c).toBeDefined();
		expect(b!.y).toBeGreaterThan(a!.y);
		expect(c!.y).toBeGreaterThan(b!.y);
	});

	it("places siblings on the same layer", async () => {
		const result = await layoutGraph(
			[{ id: "root" }, { id: "left" }, { id: "right" }],
			[
				{ source: "root", target: "left" },
				{ source: "root", target: "right" },
			],
			{ mode: "hierarchy" },
		);
		expect(result.positions.get("left")!.y).toBeCloseTo(
			result.positions.get("right")!.y,
		);
		expect(result.positions.get("left")!.x).not.toBeCloseTo(
			result.positions.get("right")!.x,
		);
	});

	it("returns an empty layout for an empty graph", async () => {
		const result = await layoutGraph([], [], { mode: "hierarchy" });
		expect(result.positions.size).toBe(0);
	});
});
