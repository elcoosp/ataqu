import { useDrillDown } from "@ataqu/api-client";
import type React from "react";
import { useDrillDownStore } from "../../hooks/use-drill-down-store";

export const withChartInteraction = (WrappedChart: React.FC<any>) => {
	return ({ widgetId, ...props }: any) => {
		const setDrillDown = useDrillDownStore((s) => s.setDrillDown);
		const setOpen = useDrillDownStore((s) => s.setOpen);
		const { mutateAsync } = useDrillDown();

		const dimension = props.xAxisKey || "category";
		const metric = props.series?.[0]?.key ?? "revenue";

		const handleDataPointClick = async (payload: Record<string, unknown>) => {
			const value = payload?.[dimension];
			if (value === undefined || value === null) return;

			setOpen(true);
			setDrillDown({
				loading: true,
				widgetId,
				dimension,
				value: String(value),
				data: [],
			});

			try {
				const result = await mutateAsync({
					metric,
					dimension,
					value: String(value),
				});
				setDrillDown({ loading: false, data: result });
			} catch {
				setDrillDown({ loading: false, data: [] });
			}
		};

		return <WrappedChart {...props} onDataPointClick={handleDataPointClick} />;
	};
};
