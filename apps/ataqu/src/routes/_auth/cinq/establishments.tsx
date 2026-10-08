import { PageLayout } from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import { EstablishmentList } from "../../../apps/cinq/components/establishment-list";

export const Route = createFileRoute("/_auth/cinq/establishments")({
	component: EstablishmentsPage,
});

function EstablishmentsPage() {
	return (
		<PageLayout
			title={<Trans>Establishments</Trans>}
			breadcrumbs={[
				{ label: "CINQ", to: "/cinq/dashboard" },
				{ label: "Establishments" },
			]}
		>
			<EstablishmentList />
		</PageLayout>
	);
}
