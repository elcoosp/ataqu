import { PageLayout } from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import { CsvImport } from "../../../apps/cinq/components/csv-import";

export const Route = createFileRoute("/_auth/cinq/import")({
	component: ImportPage,
});

function ImportPage() {
	return (
		<PageLayout
			title={<Trans>Import CSV</Trans>}
			breadcrumbs={[
				{ label: "CINQ", to: "/cinq/dashboard" },
				{ label: "Import" },
			]}
		>
			<CsvImport />
		</PageLayout>
	);
}
