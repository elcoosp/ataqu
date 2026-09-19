import { useParams } from "@tanstack/react-router";
import { useBookingStore } from "../../../apps/tempo/hooks/use-booking-store";
import { ConfirmationScreen } from "./booking/confirmation-screen";
import { EventTypeSelector } from "./booking/event-type-selector";
import { GuestForm } from "./booking/guest-form";
import { TimeSlotPicker } from "./booking/time-slot-picker";

export function PublicBookingPage() {
	const { slug } = useParams({ strict: false }) as { slug: string };
	const currentScreen = useBookingStore((state) => state.currentScreen);

	return (
		<div className="min-h-screen bg-background flex items-center justify-center p-4">
			<div className="w-full max-w-md">
				<div className="ataqu-glass rounded-xl p-8">
					{currentScreen === "event-type" && <EventTypeSelector slug={slug} />}
					{currentScreen === "time-slot" && <TimeSlotPicker />}
					{currentScreen === "guest-form" && <GuestForm />}
					{currentScreen === "confirmation" && <ConfirmationScreen />}
				</div>
			</div>
		</div>
	);
}
