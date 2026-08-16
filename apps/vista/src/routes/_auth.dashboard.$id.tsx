import {
	useCombineData,
	useDeleteDashboard,
	useGetDashboard,
	useGetDataPoints,
	useGetKpis,
	useUpdateDashboard,
} from "@ataqu/api-client";
import {
	Bone,
	Button,
	Card,
	CardTitle,
	OnboardTour,
	Shell,
	Skeleton,
} from "@ataqu/ui";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Combine, Plus } from "lucide-react";
import React from "react";
import type { Layout } from "react-grid-layout";
import { toast } from "sonner";
import { DrillDownPanel } from "../components/dashboard/drill-down-panel";
import { DashboardGrid, type Widget } from "../components/dashboard-grid";
import { ExportButtons } from "../components/export-buttons";
import { FilterBar } from "../components/filter-bar";
import { SseIndicator } from "../components/sse-indicator";
import { WidgetPicker } from "../components/widget-picker";
import { useVistaSSE } from "../hooks/use-sse";

export const Route = createFileRoute("/_auth/dashboard/$id")({
	component: DashboardDetailPage,
});

function DashboardDetailPage() {
	const { id } = Route.useParams();
	const { data: dashboard, isLoading } = useGetDashboard(id);
	const updateDashboardMutation = useUpdateDashboard();
	const deleteDashboardMutation = useDeleteDashboard();
	const queryClient = useQueryClient();
	const navigate = Route.useNavigate();

	const [isWidgetPickerOpen, setWidgetPickerOpen] = React.useState(false);
	const [isCombineOpen, setIsCombineOpen] = React.useState(false);
	const { isConnected } = useVistaSSE(`/api/vista/kpis/${id}/stream`);

	const config = (dashboard?.config || {}) as { widgets?: Widget[] };
	const widgets = config.widgets || [
		{ i: "w1", type: "kpi", dataSource: "Revenue", data: [] },
		{
			i: "w2",
			type: "bar",
			dataSource: "Pipeline",
			data: [
				{ name: "Jan", value: 4000 },
				{ name: "Feb", value: 3000 },
			],
		},
		{
			i: "w3",
			type: "line",
			dataSource: "Stock",
			data: [
				{ name: "Jan", value: 200 },
				{ name: "Feb", value: 150 },
			],
		},
	];

	const tourSteps = [
		{
			selector: '[data-tour="kpi-card"]',
			content: t`No ETL pipelines. This data is live from CINQ, right now.`,
		},
		{
			selector: '[data-tour="sse-indicator"]',
			content: t`When a deal closes, this updates in milliseconds. No refresh button needed.`,
		},
	];

	const handleAddWidget = async (type: string, dataSource: string) => {
		if (!dashboard) return;
		const newWidget = { i: `w${Date.now()}`, type, dataSource, data: [] };
		const newWidgets = [...widgets, newWidget];
		try {
			await updateDashboardMutation.mutateAsync({
				id,
				data: { config: { ...config, widgets: newWidgets } },
				version: dashboard.version,
			});
			queryClient.invalidateQueries({ queryKey: ["vista", "dashboard", id] });
			toast.success(t`Widget added.`);
		} catch {
			toast.error(t`Failed to add widget.`);
		}
	};

	const handleLayoutChange = async (newLayout: Layout[]) => {
		if (!dashboard) return;
		const updatedWidgets = widgets.map((w) => {
			const layoutItem = newLayout.find((l) => l.i === w.i);
			return { ...w, layout: layoutItem };
		});
		try {
			await updateDashboardMutation.mutateAsync({
				id,
				data: { config: { ...config, widgets: updatedWidgets } },
				version: dashboard.version,
			});
		} catch {
			// Silent fail for layout saves
		}
	};

	return (
		<Shell activeApp="vista">
			<DrillDownPanel />
			<OnboardTour tourId="vista-dashboard-tour" steps={tourSteps}>
				<div className="flex flex-col h-full">
					<div className="flex items-center justify-between p-4 border-b border-gray-700/40">
						<div className="flex items-center gap-4">
							<Button
								variant="ghost"
								size="icon"
								onClick={() => window.history.back()}
							>
								<ArrowLeft className="h-4 w-4" />
							</Button>
							<h1 className="text-xl font-heading text-white">
								{dashboard?.name || <Trans>Dashboard</Trans>}
							</h1>
							<SseIndicator isConnected={isConnected} />
						</div>
						<div className="flex items-center gap-4">
							<ExportButtons dashboardId={id} />
							<Button
								size="sm"
								variant="destructive"
								disabled={deleteDashboardMutation.isPending}
								onClick={async () => {
									await deleteDashboardMutation.mutateAsync(id);
									queryClient.invalidateQueries({
										queryKey: ["vista", "dashboards"],
									});
									navigate({ to: "/dashboard" });
								}}
							>
								<Trans>Delete</Trans>
							</Button>
							<Button
								size="sm"
								variant="outline"
								onClick={() => setIsCombineOpen(true)}
							>
								<Combine className="h-4 w-4 mr-2" />
								<Trans>Combine Data</Trans>
							</Button>
							<Button size="sm" onClick={() => setWidgetPickerOpen(true)}>
								<Plus className="h-4 w-4 mr-2" />
								<Trans>Add Widget</Trans>
							</Button>
						</div>
					</div>

					<FilterBar
						onRefresh={() =>
							queryClient.invalidateQueries({ queryKey: ["vista"] })
						}
					/>

					<div className="flex-1 overflow-auto p-8">
						{isLoading ? (
							<Skeleton className="h-64 w-full" />
						) : (
							<DashboardGrid
								widgets={widgets}
								onLayoutChange={handleLayoutChange}
							/>
						)}
						<KpiSummaryPanel />
					</div>
				</div>
			</OnboardTour>
			<WidgetPicker
				isOpen={isWidgetPickerOpen}
				onClose={() => setWidgetPickerOpen(false)}
				onAdd={handleAddWidget}
			/>

			{isCombineOpen && (
				<CombineDataModal
					onClose={() => setIsCombineOpen(false)}
					dashboardId={id}
				/>
			)}
		</Shell>
	);
}

const CombineDataModal: React.FC<{
	onClose: () => void;
	dashboardId: string;
}> = ({ onClose, dashboardId }) => {
	const [primary, setPrimary] = React.useState("revenue");
	const [secondary, setSecondary] = React.useState("inventory");
	const queryClient = useQueryClient();
	const combine = useCombineData({
		onSuccess: () => {
			toast.success(t`Data combined successfully.`);
			queryClient.invalidateQueries({
				queryKey: ["vista", "dashboard", dashboardId],
			});
			onClose();
		},
		onError: () => toast.error(t`Failed to combine data.`),
	});

	const handleCombine = () => {
		combine.mutate({
			primary,
			secondary,
			from_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
			to_date: new Date().toISOString(),
		});
	};

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
			onClick={onClose}
			onKeyDown={(e: React.KeyboardEvent) => {
				if (e.key === "Escape") onClose();
			}}
		>
			<div
				className="w-[425px] bg-card border border-gray-700/40 rounded-lg p-6 flex flex-col gap-4"
				onClick={(e: React.MouseEvent) => e.stopPropagation()}
				onKeyDown={(e: React.KeyboardEvent) => e.stopPropagation()}
			>
				<h2 className="text-lg font-semibold">
					<Trans>Combine Data</Trans>
				</h2>
				<div className="grid gap-4 py-4">
					<div className="grid grid-cols-4 items-center gap-4">
						<label htmlFor="primary-source" className="text-right text-sm">
							<Trans>Primary</Trans>
						</label>
						<select
							id="primary-source"
							value={primary}
							onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
								setPrimary(e.target.value)
							}
							className="col-span-3 bg-deep-night/50 p-2 rounded border border-gray-700/40"
						>
							<option value="revenue">{t`Revenue`}</option>
							<option value="support">{t`Support`}</option>
						</select>
					</div>
					<div className="grid grid-cols-4 items-center gap-4">
						<label htmlFor="secondary-source" className="text-right text-sm">
							<Trans>Secondary</Trans>
						</label>
						<select
							id="secondary-source"
							value={secondary}
							onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
								setSecondary(e.target.value)
							}
							className="col-span-3 bg-deep-night/50 p-2 rounded border border-gray-700/40"
						>
							<option value="inventory">{t`Inventory`}</option>
							<option value="sales">{t`Sales`}</option>
						</select>
					</div>
				</div>
				<div className="flex justify-end gap-2">
					<Button variant="outline" onClick={onClose}>
						<Trans>Cancel</Trans>
					</Button>
					<Button onClick={handleCombine} disabled={combine.isPending}>
						<Trans>Combine</Trans>
					</Button>
				</div>
			</div>
		</div>
	);
};

function KpiSummaryPanel() {
	const { data: kpis, isLoading: kpisLoading } = useGetKpis();
	const { data: dataPoints, isLoading: dpLoading } = useGetDataPoints(
		"revenue",
		{ limit: 8 },
	);

	return (
		<div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
			<Card className="p-4">
				<CardTitle className="text-white mb-3">
					<Trans>KPI Summary</Trans>
				</CardTitle>
				<Bone
					loading={kpisLoading}
					name="kpi-summary"
					fallback={<div className="h-20 w-full rounded bg-white/5" />}
				>
					<ul className="space-y-1 text-sm text-white/90">
						{(kpis
							? [
									["Total Revenue", kpis.total_revenue],
									["Pipeline Value", kpis.total_pipeline_value],
									["Deals Won", kpis.total_deals_won],
									["Low Stock", kpis.low_stock_variants],
								]
							: []
						).map(([label, value]) => (
							<li key={label} className="flex justify-between">
								<span className="text-muted-foreground">{label}</span>
								<span>{String(value ?? 0)}</span>
							</li>
						))}
						{kpis === undefined && (
							<li className="text-muted-foreground">
								<Trans>No KPIs available.</Trans>
							</li>
						)}
					</ul>
				</Bone>
			</Card>
			<Card className="p-4">
				<CardTitle className="text-white mb-3">
					<Trans>Data Points (revenue)</Trans>
				</CardTitle>
				<Bone
					loading={dpLoading}
					name="datapoints"
					fallback={<div className="h-20 w-full rounded bg-white/5" />}
				>
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<tbody>
								{(dataPoints ?? []).slice(0, 8).map((dp, i) => (
									<tr key={i} className="border-t border-white/5">
										<td className="px-2 py-1 text-muted-foreground">
											{dp.metric_name}
										</td>
										<td className="px-2 py-1 text-white/90">
											{String(dp.value)}
										</td>
									</tr>
								))}
								{(dataPoints ?? []).length === 0 && (
									<tr>
										<td className="px-2 py-1 text-muted-foreground">
											<Trans>No data points.</Trans>
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>
				</Bone>
			</Card>
		</div>
	);
}
