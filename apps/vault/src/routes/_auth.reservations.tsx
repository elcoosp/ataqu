import { createFileRoute } from '@tanstack/react-router';
import { ReservationList } from '../components/reservation-list';
import { ToastViewport } from '../components/toast-viewport';

export const Route = createFileRoute('/_auth/reservations')({
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
