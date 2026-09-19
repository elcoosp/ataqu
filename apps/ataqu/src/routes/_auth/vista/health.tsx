import { type HealthStatus, useHealth } from "@ataqu/api-client";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, RefreshCw, XCircle } from "lucide-react";

export const Route = createFileRoute("/_auth/vista/health")({
	component: HealthPage,
});

function StatusBadge({ status }: { status: HealthStatus }) {
	const map = {
		Nominal: { cls: "bg-success/15 text-success", Icon: CheckCircle2 },
		Degraded: { cls: "bg-amber/15 text-amber", Icon: AlertTriangle },
		Critical: { cls: "bg-destructive/15 text-destructive", Icon: XCircle },
	} as const;
	const { cls, Icon } = map[status];
	return (
		<span
			className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${cls}`}
		>
			<Icon className="h-4 w-4" />
			{status}
		</span>
	);
}

function MetricCard({
	label,
	value,
	hint,
	status,
}: {
	label: string;
	value: string | number;
	hint?: string;
	status?: HealthStatus;
}) {
	const tone =
		status === "Critical"
			? "text-destructive"
			: status === "Degraded"
				? "text-amber"
				: "text-white";
	return (
		<div className="rounded-lg border border-border/40 bg-deep-night/60 p-4">
			<p className="text-xs uppercase tracking-wide text-muted-foreground">
				{label}
			</p>
			<p className={`mt-1 text-2xl font-heading ${tone}`}>{value}</p>
			{hint ? (
				<p className="mt-1 text-xs text-muted-foreground">{hint}</p>
			) : null}
		</div>
	);
}

function HealthPage() {
	const { data, isLoading, isError, refetch, isFetching } = useHealth(15_000);

	return (
		<div className="flex flex-col h-full overflow-auto">
			<div className="flex items-center justify-between p-6 border-b border-border/40">
				<div>
					<h1 className="text-xl font-heading text-white">System Health</h1>
					<p className="text-sm text-muted-foreground">
						Live status of the Ataqu platform components.
					</p>
				</div>
				<div className="flex items-center gap-3">
					{data ? <StatusBadge status={data.status} /> : null}
					<button
						type="button"
						onClick={() => refetch()}
						disabled={isFetching}
						className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm text-secondary-foreground hover:bg-border/40 disabled:opacity-50"
					>
						<RefreshCw
							className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
						/>
						Refresh
					</button>
				</div>
			</div>

			<div className="p-6">
				{isLoading ? (
					<p className="text-sm text-muted-foreground">
						Loading system health…
					</p>
				) : isError || !data ? (
					<p className="text-sm text-destructive">
						Unable to load system health. The health service may be unavailable.
					</p>
				) : (
					<div className="space-y-6">
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
							<MetricCard
								label="Outbox Status"
								value={data.components.outbox.status}
								status={data.components.outbox.status}
								hint={`Lag ${data.components.outbox.lag_seconds.toFixed(1)}s · ${data.components.outbox.pending_events} pending events`}
							/>
							<MetricCard
								label="SPARK Workflows"
								value={data.components.spark_workflows.status}
								status={data.components.spark_workflows.status}
								hint={`${data.components.spark_workflows.total} total · ${data.components.spark_workflows.failed_last_hour} failed (1h) · DLQ ${data.components.spark_workflows.dlq_depth}`}
							/>
							<MetricCard
								label="DB Connection Pool"
								value={`${data.components.db_connection_pools.used} / ${data.components.db_connection_pools.max}`}
								hint={`${data.components.db_connection_pools.waiting} waiting`}
							/>
						</div>

						<div className="rounded-lg border border-border/40 bg-deep-night/60 p-4 text-xs text-muted-foreground">
							Last updated: {new Date(data.timestamp).toLocaleString()}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
