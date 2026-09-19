import type { WorkflowRun } from "@ataqu/api-client";
import { searchSchema, stringSearch, useUrlState } from "@ataqu/shared-hooks";
import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useListWorkflowRuns } from "../../../apps/spark/api/spark-api";
import { ExecutionHistory } from "../../../apps/spark/components/execution-history";
import { RunDetailPanel } from "../../../apps/spark/components/run-detail-panel";

export const Route = createFileRoute("/_auth/spark/runs")({
	validateSearch: searchSchema({
		runId: stringSearch(""),
	}),
	component: RunsPage,
});

function RunsPage() {
	const { data, isLoading } = useListWorkflowRuns({ limit: 50, offset: 0 });
	const search = Route.useSearch();
	const [runId, setRunId] = useUrlState({
		search,
		setSearch: (next) => Route.useNavigate()({ search: next as never }),
		key: "runId",
		default: "",
		parse: stringSearch(""),
		serialize: (v) => (v === "" ? undefined : v),
	});

	const activeRun = useMemo(
		() =>
			runId ? ((data?.items ?? []).find((r) => r.id === runId) ?? null) : null,
		[runId, data],
	);

	return (
		<div className="p-6 space-y-6 max-w-4xl mx-auto">
			<div>
				<h1 className="text-2xl font-heading font-bold text-foreground">
					<Trans>Execution History</Trans>
				</h1>
				<p className="text-sm text-muted-foreground mt-1">
					<Trans>Monitor all workflow runs across your workspace.</Trans>
				</p>
			</div>

			<ExecutionHistory
				runs={data?.items ?? []}
				isLoading={isLoading}
				onSelectRun={(run) => setRunId(run.id)}
			/>

			{activeRun && (
				<RunDetailPanel run={activeRun} onClose={() => setRunId("")} />
			)}
		</div>
	);
}
