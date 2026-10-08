import { PageLayout } from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import { VistaCommandRegistrar } from "../../../apps/vista/actions";
import { SqlEditor } from "../../../apps/vista/components/sql-editor";

export const Route = createFileRoute("/_auth/vista/explore")({
	component: ExplorePage,
});

function ExplorePage() {
	return (
		<PageLayout
			title={<Trans>Explore data</Trans>}
			breadcrumbs={[
				{ label: "VISTA", to: "/vista/dashboard" },
				{ label: "Explore" },
			]}
		>
			<VistaCommandRegistrar />
			<div className="h-[calc(100vh-12rem)]">
				<SqlEditor />
			</div>
		</PageLayout>
	);
}
