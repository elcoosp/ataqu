import {
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	cn,
	Label,
	SegmentedControl,
	Slider,
} from "@ataqu/ui";
import {
	Eye,
	EyeOff,
	Maximize2,
	RotateCcw,
	Sliders,
	ZoomIn,
	ZoomOut,
} from "lucide-react";
import type { LayoutMode } from "../types";

function Separator() {
	return <div className="my-2 border-t border-border/40" />;
}

export interface GraphControlsProps {
	layoutMode: LayoutMode;
	setLayoutMode: (mode: LayoutMode) => void;
	showLabels: boolean;
	setShowLabels: (v: boolean) => void;
	showEdgeArrows: boolean;
	setShowEdgeArrows: (v: boolean) => void;
	nodeSize: number;
	setNodeSize: (v: number) => void;
	edgeWidth: number;
	setEdgeWidth: (v: number) => void;
	onResetView: () => void;
	onFitView: () => void;
	onRecenter: () => void;
	onZoomIn?: () => void;
	onZoomOut?: () => void;
	className?: string;
}

export function GraphControls({
	layoutMode,
	setLayoutMode,
	showLabels,
	setShowLabels,
	showEdgeArrows,
	setShowEdgeArrows,
	nodeSize,
	setNodeSize,
	edgeWidth,
	setEdgeWidth,
	onResetView,
	onFitView,
	onRecenter,
	onZoomIn,
	onZoomOut,
	className,
}: GraphControlsProps) {
	return (
		<Card className={cn("w-full border-border/40", className)}>
			<CardHeader className="pb-3">
				<CardTitle className="flex items-center gap-2 text-sm font-medium text-foreground">
					<Sliders className="h-4 w-4 text-muted-foreground" />
					Graph controls
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div>
					<Label className="mb-1.5 block text-xs text-muted-foreground">
						Layout
					</Label>
					<SegmentedControl
						label="Layout mode"
						value={layoutMode}
						onValueChange={(v) => setLayoutMode(v as LayoutMode)}
						options={[
							{ value: "force", label: "Force" },
							{ value: "hierarchy", label: "Hierarchy" },
						]}
						className="w-full"
					/>
				</div>

				<Separator />

				<div className="grid grid-cols-2 gap-2">
					<Button
						variant={showLabels ? "secondary" : "ghost"}
						size="sm"
						onClick={() => setShowLabels(!showLabels)}
						className="justify-start gap-2"
					>
						<Eye className="h-4 w-4" />
						<span className="text-xs">Labels</span>
					</Button>
					<Button
						variant={showEdgeArrows ? "secondary" : "ghost"}
						size="sm"
						onClick={() => setShowEdgeArrows(!showEdgeArrows)}
						className="justify-start gap-2"
					>
						{showEdgeArrows ? (
							<Eye className="h-4 w-4" />
						) : (
							<EyeOff className="h-4 w-4" />
						)}
						<span className="text-xs">Arrows</span>
					</Button>
				</div>

				<div className="space-y-3">
					<div className="space-y-1.5">
						<div className="flex items-center justify-between text-xs text-muted-foreground">
							<span>Node size</span>
							<span className="tabular-nums">{nodeSize.toFixed(0)}px</span>
						</div>
						<Slider
							aria-label="Node size"
							value={[nodeSize]}
							onValueChange={([v]) => setNodeSize(v)}
							min={8}
							max={60}
							step={1}
							className="w-full"
						/>
					</div>
					<div className="space-y-1.5">
						<div className="flex items-center justify-between text-xs text-muted-foreground">
							<span>Edge width</span>
							<span className="tabular-nums">{edgeWidth.toFixed(1)}px</span>
						</div>
						<Slider
							aria-label="Edge width"
							value={[edgeWidth]}
							onValueChange={([v]) => setEdgeWidth(v)}
							min={0.5}
							max={6}
							step={0.25}
							className="w-full"
						/>
					</div>
				</div>

				<Separator />

				<div className="grid grid-cols-3 gap-2">
					<Button
						aria-label="Zoom out"
						variant="outline"
						size="sm"
						onClick={onZoomOut}
						className="justify-center gap-2"
					>
						<ZoomOut className="h-4 w-4" />
					</Button>
					<Button
						aria-label="Recenter"
						variant="outline"
						size="sm"
						onClick={onRecenter}
						className="justify-center gap-2"
					>
						<RotateCcw className="h-4 w-4" />
					</Button>
					<Button
						aria-label="Zoom in"
						variant="outline"
						size="sm"
						onClick={onZoomIn}
						className="justify-center gap-2"
					>
						<ZoomIn className="h-4 w-4" />
					</Button>
				</div>

				<div className="grid grid-cols-2 gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={onFitView}
						className="justify-center gap-2"
					>
						<Maximize2 className="h-4 w-4" />
						<span className="text-xs">Fit view</span>
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={onResetView}
						className="justify-center gap-2"
					>
						<span className="text-xs">Reset view</span>
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
