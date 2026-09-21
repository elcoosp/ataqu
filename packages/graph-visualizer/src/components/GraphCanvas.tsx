import {
	cn,
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@ataqu/ui";
import {
	useCallback,
	useEffect,
	useImperativeHandle,
	useMemo,
	useRef,
	useState,
} from "react";
import type { Edge, Vertex } from "../types";

export interface GraphCanvasProps {
	vertices: ReadonlyArray<Vertex>;
	edges: ReadonlyArray<Edge>;
	positions: ReadonlyMap<string, { x: number; y: number }>;
	bounds: { width: number; height: number };
	vertexRadius?: number;
	edgeWidth?: number;
	className?: string;
	onVertexClick?: (vertex: Vertex, event: React.MouseEvent) => void;
	onVertexHover?: (vertex: Vertex | null) => void;
	onBackgroundClick?: () => void;
	onBackgroundPan?: (delta: { x: number; y: number }) => void;
	/** Imperative view controls (wire these to GraphControls). */
	ref?: React.Ref<GraphCanvasHandle>;
	selectedIds?: ReadonlySet<string>;
	emphasizedIds?: ReadonlySet<string>;
	hoveredVertexId?: string | null;
	offset?: { x: number; y: number };
}

/** Imperative view API exposed by GraphCanvas. */
export interface GraphCanvasHandle {
	zoomIn: () => void;
	zoomOut: () => void;
	/** Fit the whole graph into the viewport. */
	fitView: () => void;
	/** Alias of fitView — restores the default framing. */
	resetView: () => void;
}

function vertexColor(vertex: Vertex): string {
	if (
		vertex.data &&
		typeof vertex.data === "object" &&
		"color" in vertex.data
	) {
		const c = (vertex.data as any).color;
		if (typeof c === "string") return c;
	}
	return "hsl(var(--accent))";
}

function vertexStroke(vertex: Vertex): string {
	if (
		vertex.data &&
		typeof vertex.data === "object" &&
		"stroke" in vertex.data
	) {
		const s = (vertex.data as any).stroke;
		if (typeof s === "string") return s;
	}
	return "hsl(var(--border))";
}

function labelColor(vertex: Vertex): string {
	if (
		vertex.data &&
		typeof vertex.data === "object" &&
		"labelColor" in vertex.data
	) {
		const lc = (vertex.data as any).labelColor;
		if (typeof lc === "string") return lc;
	}
	return "hsl(var(--foreground))";
}

function VertexGroup({
	vertex,
	x,
	y,
	r,
	selected,
	hovered,
	emphasized,
	onSelect,
	onHover,
}: {
	vertex: Vertex;
	x: number;
	y: number;
	r: number;
	selected: boolean;
	hovered: boolean;
	emphasized: boolean;
	onSelect: (vertex: Vertex, event: React.MouseEvent) => void;
	onHover: (vertex: Vertex | null) => void;
}) {
	const fill = vertexColor(vertex);
	const stroke = vertexStroke(vertex);
	const labelC = labelColor(vertex);

	return (
		<g>
			{hovered && <circle cx={x} cy={y} r={r + 6} fill={fill} opacity={0.18} />}
			<Tooltip>
				<TooltipTrigger asChild>
					<circle
						cx={x}
						cy={y}
						r={r}
						fill={fill}
						stroke={stroke}
						strokeWidth={selected ? 2.5 : 1.5}
						className={cn(
							"transition-all duration-200",
							selected && "drop-shadow-[0_0_6px_hsl(var(--accent)/0.6)]",
							emphasized && "opacity-90",
						)}
						onClick={(e) => onSelect(vertex, e)}
						onMouseEnter={() => onHover(vertex)}
						onMouseLeave={() => onHover(null)}
						style={{ cursor: "pointer" }}
					/>
				</TooltipTrigger>
				<TooltipContent side="top" className="z-50">
					<div className="flex flex-col gap-0.5">
						<span className="font-medium text-xs text-foreground">
							{vertex.label ?? vertex.id}
						</span>
						{vertex.id && (
							<span className="mt-0.5 text-[10px] font-mono text-muted-foreground">
								{vertex.id}
							</span>
						)}
					</div>
				</TooltipContent>
			</Tooltip>
			{vertex.label && (
				<text
					x={x}
					y={y + r + 14}
					textAnchor="middle"
					fill={labelC}
					fontSize={11}
					fontWeight={500}
					className="select-none"
					style={{ pointerEvents: "none" }}
				>
					{vertex.label}
				</text>
			)}
		</g>
	);
}

const MIN_SCALE = 0.3;
const MAX_SCALE = 4;

export function GraphCanvas({
	vertices,
	edges,
	positions,
	bounds,
	vertexRadius = 22,
	edgeWidth = 2,
	className,
	onVertexClick,
	onVertexHover,
	onBackgroundClick,
	onBackgroundPan,
	ref: canvasRef,
	selectedIds = new Set(),
	emphasizedIds = new Set(),
	hoveredVertexId = null,
	offset = { x: 0, y: 0 },
}: GraphCanvasProps) {
	const svgRef = useRef<SVGSVGElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
	const [view, setView] = useState<{ scale: number; tx: number; ty: number }>(
		() => {
			const w = 800;
			const h = 600;
			const scale = Math.min(
				w / (bounds.width + 80),
				h / (bounds.height + 80),
				1.4,
			);
			return {
				scale,
				tx: (w - (bounds.width + offset.x * 2) * scale) / 2 - offset.x * scale,
				ty: (h - (bounds.height + offset.y * 2) * scale) / 2 - offset.y * scale,
			};
		},
	);

	// Primitive reads keep effect/callback identities stable when the parent
	// passes inline `bounds={{...}}` / omitted `offset` (fresh objects each render).
	const viewportW = dimensions.width;
	const viewportH = dimensions.height;
	const boundsW = bounds.width;
	const boundsH = bounds.height;
	const offX = offset.x;
	const offY = offset.y;

	// Apply the fitted transform, preserving state identity when it is unchanged
	// so effect-driven fits can never loop.
	const applyFit = useCallback(() => {
		const w = viewportW || 800;
		const h = viewportH || 600;
		const scale = Math.min(w / (boundsW + 80), h / (boundsH + 80), 1.4);
		const next = {
			scale,
			tx: (w - (boundsW + offX * 2) * scale) / 2 - offX * scale,
			ty: (h - (boundsH + offY * 2) * scale) / 2 - offY * scale,
		};
		setView((v) =>
			v.scale === next.scale && v.tx === next.tx && v.ty === next.ty ? v : next,
		);
	}, [viewportW, viewportH, boundsW, boundsH, offX, offY]);

	const resetView = applyFit;
	const fitView = applyFit;
	const zoomBy = useCallback((factor: number) => {
		setView((v) => ({
			...v,
			scale: Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale * factor)),
		}));
	}, []);
	const zoomIn = useCallback(() => zoomBy(1.4), [zoomBy]);
	const zoomOut = useCallback(() => zoomBy(1 / 1.4), [zoomBy]);

	// Lets a parent drive the view from GraphControls (the canvas also zooms
	// directly via wheel/drag).
	useImperativeHandle(
		canvasRef,
		() => ({ zoomIn, zoomOut, fitView, resetView }),
		[zoomIn, zoomOut, fitView, resetView],
	);

	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;
		const ro = new ResizeObserver(() => {
			const r = el.getBoundingClientRect();
			setDimensions({
				width: Math.max(1, r.width),
				height: Math.max(1, r.height),
			});
		});
		ro.observe(el);
		return () => ro.disconnect();
	}, []);

	useEffect(() => {
		applyFit();
	}, [applyFit]);

	const handleWheel = useCallback(
		(e: React.WheelEvent) => {
			e.preventDefault();
			const rect = svgRef.current?.getBoundingClientRect();
			if (!rect) return;
			const zoom = Math.exp(e.deltaY * -0.002);
			const mouseX = e.clientX - rect.left;
			const mouseY = e.clientY - rect.top;
			const worldX = (mouseX - view.tx) / view.scale;
			const worldY = (mouseY - view.ty) / view.scale;
			const newScale = Math.min(
				MAX_SCALE,
				Math.max(MIN_SCALE, view.scale * zoom),
			);
			const newTx = mouseX - worldX * newScale;
			const newTy = mouseY - worldY * newScale;
			setView({ scale: newScale, tx: newTx, ty: newTy });
		},
		[view.tx, view.ty, view.scale],
	);

	const handleMouseDown = useCallback(
		(e: React.MouseEvent) => {
			if (e.button !== 0) return;
			const svg = svgRef.current;
			if (!svg) return;
			const rect = svg.getBoundingClientRect();
			const startX = e.clientX - rect.left - view.tx;
			const startY = e.clientY - rect.top - view.ty;
			const handleMove = (ev: MouseEvent) => {
				const newTx = ev.clientX - rect.left - startX;
				const newTy = ev.clientY - rect.top - startY;
				setView((v) => ({ scale: v.scale, tx: newTx, ty: newTy }));
				onBackgroundPan?.({ x: ev.movementX, y: ev.movementY });
			};
			const handleUp = () => {
				svg.removeEventListener("mousemove", handleMove);
				svg.removeEventListener("mouseup", handleUp);
				svg.style.cursor = "grab";
			};

			svg.style.cursor = "grabbing";
			svg.addEventListener("mousemove", handleMove);
			svg.addEventListener("mouseup", handleUp);
		},
		[view.tx, view.ty, onBackgroundPan],
	);

	const handleBackgroundClick = useCallback(
		(e: React.MouseEvent) => {
			if (e.target === svgRef.current) onBackgroundClick?.();
		},
		[onBackgroundClick],
	);

	const handleVertexPointerMove = useCallback(
		(vertex: Vertex | null) => onVertexHover?.(vertex),
		[onVertexHover],
	);
	const handleVertexClick = useCallback(
		(vertex: Vertex, event: React.MouseEvent) => onVertexClick?.(vertex, event),
		[onVertexClick],
	);

	const transform = useMemo(
		() => `translate(${view.tx}px, ${view.ty}px) scale(${view.scale})`,
		[view.tx, view.ty, view.scale],
	);

	const edgeSet = useMemo(() => {
		const arr: Array<{
			sourcePos: { x: number; y: number };
			targetPos: { x: number; y: number };
			edge: Edge;
		}> = [];
		for (const e of edges) {
			const s = positions.get(e.source);
			const t = positions.get(e.target);
			if (!s || !t) continue;
			arr.push({ sourcePos: s, targetPos: t, edge: e });
		}
		return arr;
	}, [edges, positions]);

	const vertexList = useMemo(() => {
		const arr: Array<{ vertex: Vertex; pos: { x: number; y: number } }> = [];
		for (const v of vertices) {
			const p = positions.get(v.id);
			if (!p) continue;
			arr.push({ vertex: v, pos: p });
		}
		return arr;
	}, [vertices, positions]);

	if (vertices.length === 0) {
		return (
			<div
				ref={containerRef}
				className={cn(
					"flex h-full w-full items-center justify-center text-sm text-muted-foreground",
					className,
				)}
			>
				No vertices.
			</div>
		);
	}

	return (
		<TooltipProvider delayDuration={250}>
			<div
				ref={containerRef}
				className={cn(
					"relative h-full w-full overflow-hidden rounded-lg",
					className,
				)}
			>
				<svg
					className="absolute inset-0 w-full h-full opacity-30"
					style={{ pointerEvents: "none" }}
					preserveAspectRatio="none"
				>
					<defs>
						<pattern
							id="gv-grid"
							width={24}
							height={24}
							patternUnits="userSpaceOnUse"
							patternTransform={`scale(${view.scale}) translate(${view.tx / view.scale}px, ${view.ty / view.scale}px)`}
						>
							<circle
								cx={12}
								cy={12}
								r={0.6}
								fill={`hsl(var(--border)) opacity(0.5)`}
							/>
						</pattern>
					</defs>
					<rect width="100%" height="100%" fill="url(#gv-grid)" />
				</svg>

				<svg
					ref={svgRef}
					className="relative mt-0 mb-0 h-full w-full"
					width={dimensions.width}
					height={dimensions.height}
					onWheel={handleWheel}
					onMouseDown={handleMouseDown}
					onClick={handleBackgroundClick}
					style={{ cursor: "grab" }}
				>
					<g transform={transform}>
						<g>
							{edgeSet.map(({ sourcePos, targetPos, edge }, i) => {
								const dx = targetPos.x - sourcePos.x;
								const dy = targetPos.y - sourcePos.y;
								const len = Math.hypot(dx, dy) || 1;
								const nx = (dx / len) * vertexRadius;
								const ny = (dy / len) * vertexRadius;
								const sx = sourcePos.x + nx;
								const sy = sourcePos.y + ny;
								const tx = targetPos.x - nx;
								const ty = targetPos.y - ny;
								const isHighlighted =
									(hoveredVertexId === edge.source &&
										emphasizedIds.has(edge.target)) ||
									(hoveredVertexId === edge.target &&
										emphasizedIds.has(edge.source));
								return (
									<line
										key={i}
										x1={sx}
										y1={sy}
										x2={tx}
										y2={ty}
										stroke={
											isHighlighted
												? "hsl(var(--accent))"
												: "hsl(var(--border))"
										}
										strokeWidth={isHighlighted ? edgeWidth + 2.5 : edgeWidth}
										strokeLinecap="round"
										opacity={isHighlighted ? 1 : 0.5}
									/>
								);
							})}
						</g>
						<g>
							{vertexList.map(({ vertex, pos: { x, y } }) => {
								const selected = selectedIds.has(vertex.id);
								const hovered = hoveredVertexId === vertex.id;
								const r = vertexRadius + (selected ? 5 : 0) + (hovered ? 2 : 0);
								const emphasized =
									emphasizedIds.has(vertex.id) && hoveredVertexId != null;
								return (
									<VertexGroup
										key={vertex.id}
										vertex={vertex}
										x={x}
										y={y}
										r={r}
										selected={selected}
										hovered={hovered}
										emphasized={emphasized}
										onSelect={handleVertexClick}
										onHover={handleVertexPointerMove}
									/>
								);
							})}
						</g>
						<line
							x1={-30}
							y1={0}
							x2={30}
							y2={0}
							stroke="hsl(var(--border))"
							strokeWidth={1}
							opacity={0.25}
						/>
						<line
							x1={0}
							y1={-30}
							x2={0}
							y2={30}
							stroke="hsl(var(--border))"
							strokeWidth={1}
							opacity={0.25}
						/>
					</g>
				</svg>
			</div>
		</TooltipProvider>
	);
}
