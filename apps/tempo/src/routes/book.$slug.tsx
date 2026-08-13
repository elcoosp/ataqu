import { createFileRoute } from "@tanstack/react-router";
import { ErrorBoundary } from "@/components/error-boundary";
import { PublicBookingPage } from "@/components/public-booking-page";

export const Route = createFileRoute("/book/$slug")({
	component: () => (
		<ErrorBoundary>
			<PublicBookingPage />
		</ErrorBoundary>
	),
});
