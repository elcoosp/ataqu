import { createFileRoute } from '@tanstack/react-router';
import { ReservationList } from '../components/reservation-list';

// @ts-expect-error - routeTree.gen.ts is generated at build time by TanStack Router plugin
export const Route = createFileRoute('/_auth/reservations')({
  component: ReservationsPage,
});

function ReservationsPage() {
  return <ReservationList />;
}
