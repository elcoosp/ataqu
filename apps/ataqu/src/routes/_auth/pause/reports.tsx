import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import { ReportsView } from "../../../apps/pause/components/reports";

export const Route = createFileRoute("/_auth/pause/reports")({
	component: ReportsPage,
});

function ReportsPage() {
	return (
		<div className="p-8">
				<h1 className="text-2xl font-bold mb-8">
					<Trans>Reports</Trans>
				</h1>
				<ReportsView />
			</div>
	);
}
