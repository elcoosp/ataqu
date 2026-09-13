import { createFileRoute } from "@tanstack/react-router";
import { ReservationList } from "../../../apps/vault/components/reservation-list";
import { ToastViewport } from "../../../apps/vault/components/toast-viewport";

export const Route = createFileRoute("/_auth/vault/reservations")({
	component: ReservationsPage,
});

function ReservationsPage() {
	return (
		<>
			<ToastViewport />
			<ReservationList />
		</>
	);
}
