import { createFileRoute } from '@tanstack/react-router';
import { ReservationList } from '../components/reservation-list';

export const Route = createFileRoute('/_auth/reservations')({
  component: ReservationsPage,
});

function ReservationsPage() {
  return <ReservationList />;
}
