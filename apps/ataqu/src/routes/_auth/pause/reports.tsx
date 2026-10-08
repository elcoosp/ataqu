import { PageLayout } from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import { ReportsView } from "../../../apps/pause/components/reports";

export const Route = createFileRoute("/_auth/pause/reports")({
	component: ReportsPage,
});

function ReportsPage() {
	return (
		<PageLayout
			title={<Trans>Reports</Trans>}
			breadcrumbs={[
				{ label: "PAUSE", to: "/pause/dashboard" },
				{ label: "Reports" },
			]}
		>
			<ReportsView />
		</PageLayout>
	);
}
