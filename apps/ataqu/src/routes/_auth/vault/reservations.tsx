import { createFileRoute } from "@tanstack/react-router";
import { ReservationList } from "../../../apps/vault/components/reservation-list";

export const Route = createFileRoute("/_auth/vault/reservations")({
	component: ReservationsPage,
});

function ReservationsPage() {
	return (
		<>
			<ReservationList />
		</>
	);
}
