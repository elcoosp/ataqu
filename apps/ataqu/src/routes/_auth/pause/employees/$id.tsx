import { PageLayout } from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import { EmployeeDetail } from "../../../../apps/pause/components/employee-detail";

export const Route = createFileRoute("/_auth/pause/employees/$id")({
	component: EmployeeDetailPage,
});

function EmployeeDetailPage() {
	const { id } = Route.useParams();
	return (
		<PageLayout
			title={<Trans>Employee</Trans>}
			breadcrumbs={[
				{ label: "PAUSE", to: "/pause/directory" },
				{ label: "Employee" },
			]}
		>
			<EmployeeDetail id={id} />
		</PageLayout>
	);
}
