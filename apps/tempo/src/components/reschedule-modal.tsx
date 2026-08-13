import { useRescheduleBooking } from "@ataqu/api-client";
import {
	Button,
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { BookingCalendar } from "./booking-calendar";

interface RescheduleModalProps {
	bookingId: string;
	eventTypeId: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function RescheduleModal({
	bookingId,
	eventTypeId,
	open,
	onOpenChange,
}: RescheduleModalProps) {
	const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
	const rescheduleMutation = useRescheduleBooking();

	const handleReschedule = async () => {
		if (!selectedSlot) return;
		try {
			await rescheduleMutation.mutateAsync({
				id: bookingId,
				data: { starts_at: selectedSlot },
			});
			toast.success("Meeting rescheduled.");
			onOpenChange(false);
		} catch {
			toast.error("Failed to reschedule meeting.");
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						<Trans>Reschedule Meeting</Trans>
					</DialogTitle>
				</DialogHeader>
				<div className="space-y-4">
					<BookingCalendar
						eventTypeId={eventTypeId}
						selectedSlot={selectedSlot}
						onSelectSlot={setSelectedSlot}
					/>
					<Button
						onClick={handleReschedule}
						disabled={!selectedSlot}
						className="w-full"
					>
						<Trans>Reschedule</Trans>
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
