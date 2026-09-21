import {
	Badge,
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	cn,
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@ataqu/ui";
import {
	Activity,
	ArrowRight,
	BarChart3,
	Check,
	ChevronRight,
	Circle,
	Copy,
	Hash,
	Layers,
	Link2,
	MousePointer2,
	Network,
	X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { GraphMetrics } from "../analysis";
import type { Edge, Vertex } from "../types";

function Separator() {
	return <div className="border-t border-border/40 my-2" />;
}

export interface GraphInspectorProps {
	vertices: ReadonlyArray<Vertex>;
	edges: ReadonlyArray<Edge>;
	metrics: GraphMetrics | null;
	selectedVertexId: string | null;
	hoveredVertexId: string | null;
	emphasizedVertexIds: ReadonlySet<string>;
	onSelectVertex: (id: string | null) => void;
	onClearSelection: () => void;
	onCopyVertexId: (id: string) => void;
	className?: string;
}

function AdjacentRow({
	vertexId,
	vertices,
	edges,
	emphasizedIds,
	onSelect,
}: {
	vertexId: string;
	vertices: ReadonlyArray<Vertex>;
	edges: ReadonlyArray<Edge>;
	emphasizedIds: ReadonlySet<string>;
	onSelect: (id: string) => void;
}) {
	const neighborIds = new Set<string>();
	for (const e of edges) {
		if (e.source === vertexId) neighborIds.add(e.target);
		if (e.target === vertexId) neighborIds.add(e.source);
	}
	const neighbors = vertices.filter((v) => neighborIds.has(v.id));

	return (
		<div className="space-y-1">
			<div className="flex items-center gap-2 text-xs text-muted-foreground">
				<Link2 className="h-3.5 w-3.5" />
				<span>Neighbors</span>
				<Badge variant="secondary" className="ml-auto h-5 px-1.5 text-[10px]">
					{neighbors.length}
				</Badge>
			</div>
			<div className="flex flex-wrap gap-1 mt-1">
				{neighbors.length === 0 && (
					<span className="text-xs text-muted-foreground italic">none</span>
				)}
				{neighbors.map((n) => (
					<Tooltip key={n.id}>
						<TooltipTrigger asChild>
							<Button
								type="button"
								variant={emphasizedIds.has(n.id) ? "secondary" : "ghost"}
								size="sm"
								className={cn(
									"gap-1.5 justify-start text-xs max-w-[160px] truncate",
									emphasizedIds.has(n.id) && "ring-1 ring-accent/40",
								)}
								onClick={() => onSelect(n.id)}
							>
								<Circle
									className={cn(
										"h-3 w-3 shrink-0",
										emphasizedIds.has(n.id) && "text-accent",
									)}
								/>
								<span className="truncate">{n.label ?? n.id}</span>
								<ChevronRight className="h-3 w-3 shrink-0 opacity-40" />
							</Button>
						</TooltipTrigger>
						<TooltipContent side="top">
							<span className="text-xs">{n.id}</span>
						</TooltipContent>
					</Tooltip>
				))}
			</div>
		</div>
	);
}

function MetricTile({
	icon,
	label,
	value,
	detail,
}: {
	icon: React.ReactNode;
	label: string;
	value: string | number;
	detail?: React.ReactNode;
}) {
	return (
		<div className="flex items-start gap-3 rounded-lg border border-border/40 bg-background/50 p-3">
			<div className="mt-0.5 rounded-md bg-accent/10 p-1.5">{icon}</div>
			<div className="flex-1 min-w-0">
				<p className="text-xs text-muted-foreground">{label}</p>
				<p className="text-sm font-medium text-foreground mt-0.5">{value}</p>
				{detail && (
					<p className="text-[11px] text-muted-foreground mt-0.5">{detail}</p>
				)}
			</div>
		</div>
	);
}

function useCopyFeedback() {
	const [feedback, setFeedback] = useState<string | null>(null);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const copy = useCallback((id: string) => {
		navigator.clipboard
			?.writeText(id)
			.then(() => {
				setFeedback(id);
				if (timerRef.current) clearTimeout(timerRef.current);
				timerRef.current = setTimeout(() => setFeedback(null), 1200);
			})
			.catch(() => {});
	}, []);

	useEffect(
		() => () => {
			if (timerRef.current) clearTimeout(timerRef.current);
		},
		[],
	);

	return { feedback, copy };
}

export function GraphInspector({
	vertices,
	edges,
	metrics,
	selectedVertexId,
	hoveredVertexId,
	emphasizedVertexIds,
	onSelectVertex,
	onClearSelection,
	onCopyVertexId,
	className,
}: GraphInspectorProps) {
	const effectiveId =
		selectedVertexId != null ? selectedVertexId : hoveredVertexId;
	const selectedVertex = effectiveId
		? (vertices.find((v) => v.id === effectiveId) ?? null)
		: null;

	const { feedback: copyFeedback, copy } = useCopyFeedback();

	const effectiveMetrics = metrics;

	const degree = effectiveMetrics
		? (effectiveMetrics.degrees.degrees.get(effectiveId ?? "") ?? 0)
		: 0;
	const centrality = effectiveMetrics
		? (effectiveMetrics.centrality.betweennessNormalized.get(
				effectiveId ?? "",
			) ?? 0)
		: 0;

	return (
		<TooltipProvider delayDuration={300}>
			<Card className={cn("w-full border-border/40", className)}>
				<CardHeader className="pb-3">
					<div className="flex items-center justify-between">
						<CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
							<Network className="h-4 w-4 text-muted-foreground" />
							Inspector
						</CardTitle>
						{effectiveId && (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="-mr-2 h-7 w-7 p-0"
								onClick={onClearSelection}
								title="Clear selection"
							>
								<X className="h-4 w-4" />
							</Button>
						)}
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					{selectedVertex && (
						<div className="space-y-3">
							<div className="flex items-center gap-2">
								<div
									className="h-8 w-8 rounded-md flex items-center justify-center text-xs font-medium"
									style={{
										backgroundColor: "hsl(var(--accent))",
										color: "hsl(var(--accent-foreground))",
									}}
								>
									{selectedVertex.label ??
										selectedVertex.id.slice(0, 2).toUpperCase()}
								</div>
								<div className="min-w-0 flex-1">
									<p className="text-sm font-medium text-foreground truncate">
										{selectedVertex.label ?? selectedVertex.id}
									</p>
									<p className="text-xs font-mono text-muted-foreground truncate">
										{selectedVertex.id}
									</p>
								</div>
								<div className="flex gap-1 ml-2">
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className="h-7 w-7 p-0"
										onClick={() => {
											copy(selectedVertex.id);
											onCopyVertexId(selectedVertex.id);
										}}
										title="Copy vertex id"
									>
										{copyFeedback === selectedVertex.id ? (
											<Check className="h-4 w-4 text-success" />
										) : (
											<Copy className="h-4 w-4" />
										)}
									</Button>
								</div>
							</div>

							<Separator />

							<div className="grid grid-cols-3 gap-2">
								<MetricTile
									icon={<Activity className="h-4 w-4 text-accent" />}
									label="Degree"
									value={degree}
									detail="connections"
								/>
								<MetricTile
									icon={<ArrowRight className="h-4 w-4 text-accent" />}
									label="Betweenness"
									value={`${(centrality * 100).toFixed(0)}%`}
									detail="centrality"
								/>
								<MetricTile
									icon={<Layers className="h-4 w-4 text-accent" />}
									label="Component"
									value={
										effectiveMetrics?.connectivity.componentOf.get(
											effectiveId ?? "",
										) ?? "—"
									}
									detail={
										effectiveMetrics?.connectivity.componentSizes[0] ?? "—"
									}
								/>
							</div>

							{effectiveMetrics?.connectivity.componentOf.has(effectiveId!) && (
								<AdjacentRow
									vertexId={effectiveId!}
									vertices={vertices}
									edges={edges}
									emphasizedIds={emphasizedVertexIds}
									onSelect={onSelectVertex}
								/>
							)}
						</div>
					)}

					{!selectedVertex && (
						<div className="py-6 text-center">
							<MousePointer2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
							<p className="text-sm text-muted-foreground">
								Select a vertex to inspect
							</p>
							<p className="text-xs text-muted-foreground/60 mt-1">
								Click a node or hover and check the panel.
							</p>
						</div>
					)}

					{effectiveMetrics &&
						effectiveMetrics.snapshot.vertices.length > 0 && (
							<>
								<Separator />
								<div className="space-y-2">
									<div className="flex items-center gap-2 text-xs text-muted-foreground">
										<BarChart3 className="h-3.5 w-3.5" />
										<span>Graph metrics</span>
									</div>
									<div className="grid grid-cols-2 gap-2">
										<MetricTile
											icon={<Hash className="h-4 w-4" />}
											label="Vertices"
											value={effectiveMetrics.snapshot.vertices.length}
										/>
										<MetricTile
											icon={<Circle className="h-4 w-4" />}
											label="Edges"
											value={effectiveMetrics.snapshot.edges.length}
										/>
										<MetricTile
											icon={<Link2 className="h-4 w-4" />}
											label="Density"
											value={`${(effectiveMetrics.density * 100).toFixed(1)}%`}
										/>
										<MetricTile
											icon={<Layers className="h-4 w-4" />}
											label="Components"
											value={effectiveMetrics.connectivity.componentCount}
										/>
									</div>
								</div>
							</>
						)}
				</CardContent>
			</Card>
		</TooltipProvider>
	);
}
