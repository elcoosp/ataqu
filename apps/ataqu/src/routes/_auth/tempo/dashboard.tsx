import { searchSchema, useUrlState } from "@ataqu/shared-hooks";
import { useIntent } from "@ataqu/shared-stores";
import { Button, PageHeader } from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ErrorBoundary } from "../../../apps/tempo/components/error-boundary";
import { EventTypeForm } from "../../../apps/tempo/components/event-type-form";
import { RescheduleModal } from "../../../apps/tempo/components/reschedule-modal";
import { UpcomingMeetings } from "../../../apps/tempo/components/upcoming-meetings";

export const Route = createFileRoute("/_auth/tempo/dashboard")({
	validateSearch: searchSchema({
		eventTypeForm: (raw: unknown) => raw === "1",
	}),
	component: Dashboard,
});

function Dashboard() {
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	const [showEventTypeForm, setShowEventTypeForm] = useUrlState({
		search,
		setSearch: (next) => navigate({ search: next as never }),
		key: "eventTypeForm",
		default: false,
		parse: (raw: unknown) => raw === "1",
		serialize: (v) => (v ? "1" : undefined),
	});
	const [rescheduleBookingId, setRescheduleBookingId] = useState<string | null>(
		null,
	);
	const [rescheduleEventTypeId, setRescheduleEventTypeId] = useState<
		string | null
	>(null);
	const [rescheduleVersion, setRescheduleVersion] = useState<number | null>(
		null,
	);

	// Palette/`c`-key intent: "Create Event Type" must open THIS screen's form
	// instead of a no-op (brainstorm P2-2 — the command used to dispatch an
	// event nobody listened for).
	useIntent("tempo", "event-type.create", () => setShowEventTypeForm(true));

	const handleReschedule = (
		bookingId: string,
		eventTypeId: string,
		version: number,
	) => {
		setRescheduleBookingId(bookingId);
		setRescheduleEventTypeId(eventTypeId);
		setRescheduleVersion(version);
	};

	return (
		<ErrorBoundary>
			<div className="space-y-8">
				<PageHeader
					title={<Trans>Dashboard</Trans>}
					breadcrumbs={[{ label: "TEMPO", to: "/tempo/dashboard" }]}
					actions={
						<>
							<Button variant="outline" asChild>
								<Link to="/tempo/calendar-settings">
									<Trans>Connect Calendar</Trans>
								</Link>
							</Button>
							<Button variant="outline" asChild>
								<Link to="/tempo/availability">
									<Trans>Manage availability</Trans>
								</Link>
							</Button>
							<Button onClick={() => setShowEventTypeForm(true)}>
								<Trans>Create Event Type</Trans>
							</Button>
						</>
					}
				/>

				{showEventTypeForm && (
					<div className="ataqu-glass rounded-lg p-6">
						<EventTypeForm onSuccess={() => setShowEventTypeForm(false)} />
					</div>
				)}

				<UpcomingMeetings onReschedule={handleReschedule} />

				{rescheduleBookingId && rescheduleEventTypeId && (
					<RescheduleModal
						bookingId={rescheduleBookingId}
						eventTypeId={rescheduleEventTypeId}
						version={rescheduleVersion ?? undefined}
						open={!!rescheduleBookingId}
						onOpenChange={(open) => {
							if (!open) {
								setRescheduleBookingId(null);
								setRescheduleEventTypeId(null);
							}
						}}
					/>
				)}
			</div>
		</ErrorBoundary>
	);
}
