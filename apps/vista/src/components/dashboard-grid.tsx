import { Chart } from "@ataqu/ui";
import type React from "react";
import GridLayout, { type Layout } from "react-grid-layout";
import { withChartInteraction } from "./dashboard/chart-interaction";
import { KpiCard } from "./kpi-card";

const InteractiveChart = withChartInteraction(Chart);

export interface Widget {
	i: string;
	type: string;
	dataSource: string;
	data?: Record<string, string | number>[];
}

interface DashboardGridProps {
	widgets: Widget[];
	onLayoutChange: (layout: Layout[]) => void;
}

export const DashboardGrid: React.FC<DashboardGridProps> = ({
	widgets,
	onLayoutChange,
}) => {
	const layout: Layout[] = widgets.map((w, i) => ({
		i: w.i,
		x: (i % 2) * 6,
		y: Math.floor(i / 2) * 4,
		w: 6,
		h: 4,
	}));

	return (
		<GridLayout
			className="layout"
			layout={layout}
			cols={12}
			rowHeight={80}
			width={1200}
			onLayoutChange={onLayoutChange}
			draggableHandle=".drag-handle"
		>
			{widgets.map((w) => (
				<div
					key={w.i}
					className="bg-card border border-gray-700/40 rounded-lg p-4 overflow-hidden relative"
				>
					<div className="drag-handle absolute top-2 left-2 cursor-move text-gray-500 hover:text-white z-10">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
							role="img"
							aria-label="Drag widget"
						>
							<title>Drag widget</title>
							<circle cx="9" cy="5" r="1" />
							<circle cx="9" cy="12" r="1" />
							<circle cx="9" cy="19" r="1" />
							<circle cx="15" cy="5" r="1" />
							<circle cx="15" cy="12" r="1" />
							<circle cx="15" cy="19" r="1" />
						</svg>
					</div>
					<div className="h-full w-full pt-6">
						{w.type === "kpi" && (
							<KpiCard
								label={w.dataSource}
								value="12,345"
								trend="up"
								trendValue="+5%"
							/>
						)}
						{w.type === "bar" && (
							<InteractiveChart
								widgetId={w.i}
								type="bar"
								data={w.data || []}
								xAxisKey="name"
								series={[{ key: "value", name: w.dataSource }]}
							/>
						)}
						{w.type === "line" && (
							<InteractiveChart
								widgetId={w.i}
								type="line"
								data={w.data || []}
								xAxisKey="name"
								series={[{ key: "value", name: w.dataSource }]}
							/>
						)}
						{w.type === "pie" && (
							<InteractiveChart
								widgetId={w.i}
								type="pie"
								data={w.data || []}
								xAxisKey="name"
								series={[{ key: "value", name: w.dataSource }]}
							/>
						)}
					</div>
				</div>
			))}
		</GridLayout>
	);
};
