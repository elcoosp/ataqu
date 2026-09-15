import { getDataPoints } from "@ataqu/api-client";
import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";

/** Shape of a dashboard widget as persisted in the dashboard config. */
export interface WidgetConfig {
	i: string;
	type: string;
	dataSource: string;
	data?: Record<string, string | number>[];
}

/**
 * Fetches real data points for every chart widget on a dashboard and merges
 * them into the widget definitions. Replaces the previous hardcoded sample
 * data so VISTA charts reflect the live backend.
 */
export function useWidgetData<T extends WidgetConfig>(widgets: T[]): T[] {
	const chartWidgets = useMemo(
		() => widgets.filter((w) => w.type !== "kpi"),
		[widgets],
	);

	const results = useQueries({
		queries: chartWidgets.map((w) => ({
			queryKey: ["vista", "data-points", w.dataSource, { limit: 12 }],
			queryFn: () => getDataPoints(w.dataSource, { limit: 12 }),
			staleTime: 30_000,
		})),
	});

	return useMemo(() => {
		const dataByWidgetId = new Map<string, Record<string, string | number>[]>();
		chartWidgets.forEach((w, index) => {
			const points = results[index]?.data ?? [];
			dataByWidgetId.set(
				w.i,
				points.map((p) => ({
					name: new Date(p.timestamp).toLocaleDateString(undefined, {
						month: "short",
						day: "numeric",
					}),
					value: p.value,
				})),
			);
		});

		return widgets.map((w) =>
			dataByWidgetId.has(w.i) ? { ...w, data: dataByWidgetId.get(w.i) } : w,
		);
	}, [widgets, chartWidgets, results]);
}
