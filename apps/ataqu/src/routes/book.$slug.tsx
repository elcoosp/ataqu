import { createFileRoute } from "@tanstack/react-router";
import { ErrorBoundary } from "../apps/tempo/components/error-boundary";
import { PublicBookingPage } from "../apps/tempo/components/public-booking-page";

export const Route = createFileRoute("/book/$slug")({
	component: () => (
		<ErrorBoundary>
			<PublicBookingPage />
		</ErrorBoundary>
	),
});
