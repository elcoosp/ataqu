import { DashboardLayout } from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import { EstablishmentList } from "../components/establishment-list";

export const Route = createFileRoute("/_auth/establishments")({
	component: EstablishmentsPage,
});

function EstablishmentsPage() {
	return (
		<DashboardLayout>
			<div className="p-4">
				<h1 className="mb-4 text-2xl font-bold">
					<Trans>Establishments</Trans>
				</h1>
				<EstablishmentList />
			</div>
		</DashboardLayout>
	);
}
