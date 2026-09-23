import { PageHeader } from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import { AvailabilityEditor } from "../../../apps/tempo/components/availability-editor";

/**
 * TEMPO availability editor (brainstorm P0 §5.1-7).
 *
 * `?eventType=<id>` is URL state so the event-type detail page can deep-link
 * straight into the right slot list, and so the selection is shareable. The
 * param is optional (`eventType?: string`) so plain links to the page type-check
 * without a `search` prop.
 */
export const Route = createFileRoute("/_auth/tempo/availability")({
	validateSearch: (raw: Record<string, unknown>): { eventType?: string } => ({
		eventType: typeof raw.eventType === "string" ? raw.eventType : undefined,
	}),
	component: AvailabilityPage,
});

function AvailabilityPage() {
	const { eventType } = Route.useSearch();

	return (
		<div className="space-y-6">
			<PageHeader
				title={<Trans>Availability</Trans>}
				breadcrumbs={[
					{ label: "TEMPO", to: "/tempo/dashboard" },
					{ label: "Availability" },
				]}
			/>
			<AvailabilityEditor initialEventTypeId={eventType} />
		</div>
	);
}
