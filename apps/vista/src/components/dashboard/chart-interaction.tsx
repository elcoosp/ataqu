import { useDrillDown } from "@ataqu/api-client";
import type React from "react";
import { useDrillDownStore } from "../../hooks/use-drill-down-store";

export const withChartInteraction = (WrappedChart: React.FC<any>) => {
	return ({ widgetId, ...props }: any) => {
		const setDrillDown = useDrillDownStore((s) => s.setDrillDown);
		const setOpen = useDrillDownStore((s) => s.setOpen);
		const { mutateAsync } = useDrillDown();

		const handleDataPointClick = async (data: unknown) => {
			const dimension = props.xAxisKey || "category";
			interface RechartsPayload {
				activePayload?: { payload?: Record<string, unknown> }[];
			}
			const value =
				((data as RechartsPayload)?.activePayload?.[0]?.payload?.[
					dimension
				] as string) || "Unknown";

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
					metric: props.series[0].key,
					dimension,
					value: String(value),
				});
				setDrillDown({ loading: false, data: result });
			} catch {
				setDrillDown({ loading: false, data: [] });
			}
		};

		const dimension = props.xAxisKey || "category";

		return (
			<button
				type="button"
				className="block w-full h-full bg-transparent border-0 p-0 cursor-pointer text-left"
				onClick={() =>
					handleDataPointClick({
						activePayload: [{ payload: { [dimension]: "Clicked" } }],
					})
				}
			>
				<WrappedChart {...props} />
			</button>
		);
	};
};
