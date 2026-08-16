import {
	useCancelBooking,
	useListBookings,
	useMarkNoShow,
} from "@ataqu/api-client";
import { Badge, Bone, Button } from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import { EmptyState } from "@/components/ui/empty-state";
import { useMeetingJoined } from "@/hooks/use-meeting-joined";
import { toast } from "@/hooks/use-toast";
import { NoShowBadge } from "./no-show-badge";

const CalendarIcon = (
	<svg
		role="img"
		aria-label="Calendar"
		xmlns="http://www.w3.org/2000/svg"
		width="48"
		height="48"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		<rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
		<line x1="16" x2="16" y1="2" y2="6" />
		<line x1="8" x2="8" y1="2" y2="6" />
		<line x1="3" x2="21" y1="10" y2="10" />
	</svg>
);

interface UpcomingMeetingsProps {
	onReschedule: (
		bookingId: string,
		eventTypeId: string,
		version: number,
	) => void;
}

export function UpcomingMeetings({ onReschedule }: UpcomingMeetingsProps) {
	const { data: bookingsData, isLoading } = useListBookings({
		limit: 10,
		offset: 0,
	});
	const cancelMutation = useCancelBooking();
	const noShowMutation = useMarkNoShow();

	// Send meeting joined signal for the first upcoming meeting
	const firstBooking = bookingsData?.items?.[0];
	useMeetingJoined(firstBooking?.id || null);

	const handleCancel = async (bookingId: string, version: number) => {
		try {
			await cancelMutation.mutateAsync({ id: bookingId, version });
			toast.success("Meeting canceled.");
		} catch {
			toast.error("Failed to cancel meeting.");
		}
	};

	const handleNoShow = async (bookingId: string, version: number) => {
		try {
			await noShowMutation.mutateAsync({ id: bookingId, version });
			toast.success("Marked as no-show.");
		} catch {
			toast.error("Failed to mark no-show.");
		}
	};

	if (isLoading) {
		return (
			<div className="space-y-4" aria-busy="true">
				<Bone
					loading
					name="upcoming-meetings-1"
					fallback={<div className="h-20 w-full" />}
				>
					{null}
				</Bone>
				<Bone
					loading
					name="upcoming-meetings-2"
					fallback={<div className="h-20 w-full" />}
				>
					{null}
				</Bone>
				<Bone
					loading
					name="upcoming-meetings-3"
					fallback={<div className="h-20 w-full" />}
				>
					{null}
				</Bone>
			</div>
		);
	}

	const bookings = bookingsData?.items ?? [];

	if (bookings.length === 0) {
		return (
			<EmptyState
				icon={CalendarIcon}
				title="No meetings scheduled"
				description="Connect your calendar and share your booking link."
				ctaLabel="Create Event Type"
			/>
		);
	}

	return (
		<div className="space-y-4">
			{bookings.map((booking) => (
				<div
					key={booking.id}
					className="ataqu-glass rounded-lg p-4 flex items-center justify-between"
				>
					<div className="space-y-1">
						<p className="font-heading text-sm font-semibold text-foreground">
							{new Date(booking.starts_at).toLocaleDateString(undefined, {
								weekday: "short",
								month: "short",
								day: "numeric",
							})}{" "}
							<span className="font-mono text-muted-foreground">
								{new Date(booking.starts_at).toLocaleTimeString(undefined, {
									hour: "2-digit",
									minute: "2-digit",
								})}
							</span>
						</p>
						<Badge
							variant={booking.status === "confirmed" ? "default" : "secondary"}
						>
							{booking.status}
						</Badge>
						{booking.status === "no_show" && <NoShowBadge />}
					</div>
					<div className="flex gap-2">
						<Button
							variant="outline"
							size="sm"
							className="min-h-[44px]"
							onClick={() =>
								onReschedule(booking.id, booking.event_type_id, booking.version)
							}
						>
							<Trans>Reschedule</Trans>
						</Button>
						<Button
							variant="destructive"
							size="sm"
							className="min-h-[44px]"
							onClick={() => handleCancel(booking.id, booking.version)}
						>
							<Trans>Cancel</Trans>
						</Button>
						{booking.status !== "no_show" &&
							booking.status !== "cancelled" &&
							booking.status !== "completed" && (
								<Button
									variant="outline"
									size="sm"
									className="min-h-[44px]"
									disabled={noShowMutation.isPending}
									onClick={() => handleNoShow(booking.id, booking.version)}
								>
									<Trans>Mark no-show</Trans>
								</Button>
							)}
					</div>
				</div>
			))}
		</div>
	);
}
