import { createFileRoute } from '@tanstack/react-router';
import { PublicBookingPage } from '@/components/public-booking-page';

export const Route = createFileRoute('/book/$slug')({
  component: PublicBookingPage,
});
