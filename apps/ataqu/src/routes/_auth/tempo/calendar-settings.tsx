import { PageLayout } from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarSettings } from "../../../apps/tempo/components/calendar-settings";

export const Route = createFileRoute("/_auth/tempo/calendar-settings")({
	component: CalendarSettingsPage,
});

function CalendarSettingsPage() {
	return (
		<PageLayout
			title={<Trans>Calendar Settings</Trans>}
			breadcrumbs={[
				{ label: "TEMPO", to: "/tempo/dashboard" },
				{ label: "Calendar settings" },
			]}
		>
			<CalendarSettings />
		</PageLayout>
	);
}
