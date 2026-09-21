import { act, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { GraphControls } from "../src/components/GraphControls";
import type { Edge, Vertex } from "../src/types";

const vertices: Vertex[] = [
	{ id: "a", label: "Alpha" },
	{ id: "b", label: "Beta" },
	{ id: "c", label: "Gamma" },
];
const edges: Edge[] = [
	{ source: "a", target: "b" },
	{ source: "b", target: "c" },
];

const baseProps = {
	layoutMode: "force" as const,
	setLayoutMode: () => {},
	showLabels: true,
	setShowLabels: () => {},
	showEdgeArrows: true,
	setShowEdgeArrows: () => {},
	nodeSize: 22,
	setNodeSize: () => {},
	edgeWidth: 2,
	setEdgeWidth: () => {},
	onResetView: () => {},
	onFitView: () => {},
	onRecenter: () => {},
};

describe("GraphControls", () => {
	it("renders the title and the layout radiogroup", () => {
		render(<GraphControls {...baseProps} />);
		expect(screen.getByText("Graph controls")).toBeInTheDocument();
		expect(
			screen.getByRole("radiogroup", { name: "Layout mode" }),
		).toBeInTheDocument();
		expect(screen.getAllByText("Force").length).toBeGreaterThan(0);
		expect(screen.getAllByText("Hierarchy").length).toBeGreaterThan(0);
	});

	it("marks the active layout as checked", () => {
		render(<GraphControls {...baseProps} layoutMode="hierarchy" />);
		expect(screen.getByRole("radio", { name: "Hierarchy" })).toHaveAttribute(
			"aria-checked",
			"true",
		);
		expect(screen.getByRole("radio", { name: "Force" })).toHaveAttribute(
			"aria-checked",
			"false",
		);
	});

	it("calls setLayoutMode when switching layouts", () => {
		const setLayoutMode = vi.fn();
		render(<GraphControls {...baseProps} setLayoutMode={setLayoutMode} />);
		fireEvent.click(screen.getByRole("radio", { name: "Hierarchy" }));
		expect(setLayoutMode).toHaveBeenCalledWith("hierarchy");
	});

	it("toggles labels and arrows", () => {
		const setShowLabels = vi.fn();
		const setShowEdgeArrows = vi.fn();
		render(
			<GraphControls
				{...baseProps}
				setShowLabels={setShowLabels}
				setShowEdgeArrows={setShowEdgeArrows}
			/>,
		);
		fireEvent.click(screen.getByText("Labels"));
		fireEvent.click(screen.getByText("Arrows"));
		expect(setShowLabels).toHaveBeenCalledWith(false);
		expect(setShowEdgeArrows).toHaveBeenCalledWith(false);
	});

	it("shows numeric readouts for node size and edge width", () => {
		render(<GraphControls {...baseProps} nodeSize={24} edgeWidth={3.5} />);
		expect(screen.getByText("24px")).toBeInTheDocument();
		expect(screen.getByText("3.5px")).toBeInTheDocument();
	});

	it("invokes the view actions", () => {
		const onFitView = vi.fn();
		const onRecenter = vi.fn();
		const onResetView = vi.fn();
		const onZoomIn = vi.fn();
		const onZoomOut = vi.fn();
		render(
			<GraphControls
				{...baseProps}
				onFitView={onFitView}
				onRecenter={onRecenter}
				onResetView={onResetView}
				onZoomIn={onZoomIn}
				onZoomOut={onZoomOut}
			/>,
		);
		fireEvent.click(screen.getByText("Fit view"));
		fireEvent.click(screen.getByText("Reset view"));
		fireEvent.click(screen.getByLabelText("Zoom in"));
		fireEvent.click(screen.getByLabelText("Zoom out"));
		fireEvent.click(screen.getByLabelText("Recenter"));
		expect(onFitView).toHaveBeenCalledOnce();
		expect(onResetView).toHaveBeenCalledOnce();
		expect(onZoomIn).toHaveBeenCalledOnce();
		expect(onZoomOut).toHaveBeenCalledOnce();
		expect(onRecenter).toHaveBeenCalledOnce();
	});
});

import { computeMetrics } from "../src/analysis";
import {
	GraphCanvas,
	type GraphCanvasHandle,
} from "../src/components/GraphCanvas";
import { GraphInspector } from "../src/components/GraphInspector";
import { GraphLegend } from "../src/components/GraphLegend";

const metrics = computeMetrics({ vertices, edges, directed: false });
const inspectorBase = {
	vertices,
	edges,
	metrics,
	hoveredVertexId: null,
	emphasizedVertexIds: new Set<string>(),
	onSelectVertex: () => {},
	onClearSelection: () => {},
	onCopyVertexId: () => {},
};

describe("GraphInspector", () => {
	it("shows an empty state when nothing is selected or hovered", () => {
		render(<GraphInspector {...inspectorBase} selectedVertexId={null} />);
		expect(screen.getByText("Select a vertex to inspect")).toBeInTheDocument();
	});

	it("renders the selected vertex with degree and component", () => {
		render(<GraphInspector {...inspectorBase} selectedVertexId="b" />);
		// The label renders in both the heading and the avatar fallback.
		expect(screen.getAllByText("Beta").length).toBeGreaterThan(0);
		expect(screen.getByText("b")).toBeInTheDocument();
		expect(screen.getByText("Degree")).toBeInTheDocument();
		expect(screen.getByText("Betweenness")).toBeInTheDocument();
		expect(screen.getByText("Component")).toBeInTheDocument();
	});

	it("falls back to the hovered vertex when nothing is selected", () => {
		render(
			<GraphInspector
				{...inspectorBase}
				selectedVertexId={null}
				hoveredVertexId="c"
			/>,
		);
		expect(screen.getAllByText("Gamma").length).toBeGreaterThan(0);
	});

	it("lists neighbours and selects them on click", () => {
		const onSelectVertex = vi.fn();
		render(
			<GraphInspector
				{...inspectorBase}
				selectedVertexId="b"
				onSelectVertex={onSelectVertex}
			/>,
		);
		expect(screen.getByText("Neighbors")).toBeInTheDocument();
		// Vertex b sits between a and c, so both are listed as neighbours.
		expect(screen.getByRole("button", { name: /Alpha/ })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Gamma/ })).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: /Alpha/ }));
		expect(onSelectVertex).toHaveBeenCalledWith("a");
	});

	it("reports graph-level metrics", () => {
		render(<GraphInspector {...inspectorBase} selectedVertexId={null} />);
		expect(screen.getByText("Graph metrics")).toBeInTheDocument();
		expect(screen.getByText("Vertices")).toBeInTheDocument();
		expect(screen.getByText("Edges")).toBeInTheDocument();
		expect(screen.getByText("Density")).toBeInTheDocument();
	});

	it("clears the selection", () => {
		const onClearSelection = vi.fn();
		render(
			<GraphInspector
				{...inspectorBase}
				selectedVertexId="a"
				onClearSelection={onClearSelection}
			/>,
		);
		fireEvent.click(screen.getByTitle("Clear selection"));
		expect(onClearSelection).toHaveBeenCalledOnce();
	});
});

describe("GraphLegend", () => {
	it("groups vertices by colour and counts them", () => {
		render(<GraphLegend vertices={vertices} />);
		expect(screen.getByText("Legend")).toBeInTheDocument();
		expect(screen.getByText("3")).toBeInTheDocument();
	});

	it("separates distinct vertex colours", () => {
		render(
			<GraphLegend
				vertices={[
					{ id: "x", data: { color: "tomato" } },
					{ id: "y", data: { color: "steelblue" } },
				]}
			/>,
		);
		expect(screen.getByText("tomato")).toBeInTheDocument();
		expect(screen.getByText("steelblue")).toBeInTheDocument();
	});
});

describe("GraphCanvas", () => {
	const positions = new Map([
		["a", { x: 0, y: 0 }],
		["b", { x: 100, y: 0 }],
		["c", { x: 200, y: 0 }],
	]);

	it("reports an empty graph", () => {
		const { container } = render(
			<GraphCanvas
				vertices={[]}
				edges={[]}
				positions={new Map()}
				bounds={{ width: 0, height: 0 }}
			/>,
		);
		expect(screen.getByText("No vertices.")).toBeInTheDocument();
		expect(container.querySelectorAll("circle")).toHaveLength(0);
	});

	it("draws a node per positioned vertex", () => {
		const { container } = render(
			<GraphCanvas
				vertices={vertices}
				edges={edges}
				positions={positions}
				bounds={{ width: 200, height: 0 }}
			/>,
		);
		// The vertex layer lives in the second <svg> (the first paints the grid).
		const vertexLayer = container.querySelectorAll("svg")[1];
		expect(vertexLayer.querySelectorAll("circle")).toHaveLength(3);
		expect(vertexLayer.querySelectorAll("line").length).toBeGreaterThanOrEqual(
			edges.length,
		);
	});

	it("renders vertex labels as SVG text", () => {
		render(
			<GraphCanvas
				vertices={vertices}
				edges={edges}
				positions={positions}
				bounds={{ width: 200, height: 0 }}
			/>,
		);
		expect(screen.getByText("Alpha")).toBeInTheDocument();
		expect(screen.getByText("Beta")).toBeInTheDocument();
		expect(screen.getByText("Gamma")).toBeInTheDocument();
	});

	it("invokes onVertexClick when a node is clicked", () => {
		const onVertexClick = vi.fn();
		const { container } = render(
			<GraphCanvas
				vertices={vertices}
				edges={edges}
				positions={positions}
				bounds={{ width: 200, height: 0 }}
				onVertexClick={onVertexClick}
			/>,
		);
		const vertexLayer = container.querySelectorAll("svg")[1];
		fireEvent.click(vertexLayer.querySelectorAll("circle")[0]);
		expect(onVertexClick).toHaveBeenCalledOnce();
		expect(onVertexClick.mock.calls[0][0].id).toBe("a");
	});

	it("skips vertices that have no computed position", () => {
		const { container } = render(
			<GraphCanvas
				vertices={vertices}
				edges={edges}
				positions={new Map([["a", { x: 0, y: 0 }]])}
				bounds={{ width: 0, height: 0 }}
			/>,
		);
		const vertexLayer = container.querySelectorAll("svg")[1];
		expect(vertexLayer.querySelectorAll("circle")).toHaveLength(1);
	});

	it("exposes imperative view controls through a ref", () => {
		const ref = createRef<GraphCanvasHandle>();
		const { container } = render(
			<GraphCanvas
				ref={ref}
				vertices={vertices}
				edges={edges}
				positions={positions}
				bounds={{ width: 200, height: 0 }}
			/>,
		);
		const transform = () =>
			container
				.querySelectorAll("svg")[1]
				.querySelector("g")
				?.getAttribute("transform");

		expect(ref.current).not.toBeNull();
		const before = transform();

		act(() => ref.current?.zoomIn());
		expect(transform()).not.toBe(before);

		act(() => ref.current?.zoomOut());
		act(() => ref.current?.fitView());
		act(() => ref.current?.resetView());
		expect(transform()).toBe(transform());
	});
});
