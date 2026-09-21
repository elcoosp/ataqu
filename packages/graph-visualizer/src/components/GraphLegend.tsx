import { Badge, Card, CardContent, CardHeader, CardTitle, cn } from "@ataqu/ui";
import type { Vertex } from "../types";

export interface GraphLegendProps {
	vertices: ReadonlyArray<Vertex>;
	className?: string;
}

export function GraphLegend({ vertices, className }: GraphLegendProps) {
	const colorGroups = new Map();
	for (const v of vertices) {
		const c = vertexColor(v);
		colorGroups.set(c, (colorGroups.get(c) ?? 0) + 1);
	}

	return (
		<Card className={cn("w-full border-border/40", className)}>
			<CardHeader className="pb-3">
				<CardTitle className="text-sm font-medium text-foreground">
					Legend
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-2">
				{Array.from(colorGroups.entries()).map(([color, count]) => (
					<div key={color} className="flex items-center gap-2">
						<span
							className="h-3 w-3 rounded-full"
							style={{ backgroundColor: color }}
						/>
						<span className="text-xs text-muted-foreground">{color}</span>
						<Badge variant="secondary" className="ml-auto h-4 px-1 text-[10px]">
							{count}
						</Badge>
					</div>
				))}
			</CardContent>
		</Card>
	);
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
