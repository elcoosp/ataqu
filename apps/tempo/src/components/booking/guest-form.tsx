import { usePublicCreateBooking } from "@ataqu/api-client";
import { useAuthStore } from "@ataqu/shared-stores";
import {
	FloatingLabelInput,
	InlineValidation,
	LoadingButton,
} from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import { useState } from "react";
import { useBookingStore } from "@/hooks/use-booking-store";
import { useTimezone } from "@/hooks/use-timezone";
import { toast } from "@/hooks/use-toast";

export function GuestForm() {
	const timezone = useTimezone();
	const { tenantId } = useAuthStore();
	const {
		eventType,
		selectedSlot,
		setGuestDetails,
		setBookingId,
		setCurrentScreen,
	} = useBookingStore();
	const createBookingMutation = usePublicCreateBooking();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!eventType || !selectedSlot || !tenantId) return false;
		if (!name.trim() || !email.trim()) {
			setError("Name and email are required.");
			return false;
		}
		setIsSubmitting(true);
		setError(null);
		try {
			const result = await createBookingMutation.mutateAsync({
				tenantId,
				data: {
					slug: eventType.slug,
					starts_at: selectedSlot,
					timezone,
					invitee_name: name.trim(),
					invitee_email: email.trim(),
				},
			});
			setGuestDetails({ name: name.trim(), email: email.trim() });
			setBookingId(result.id);
			toast.success("Meeting booked successfully.");
			return true;
		} catch {
			setError("This slot is no longer available. Please select another.");
			setCurrentScreen("time-slot");
			return false;
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			<h2 className="text-xl font-heading font-semibold text-foreground">
				<Trans>Enter your details</Trans>
			</h2>
			<FloatingLabelInput
				label="Name"
				value={name}
				onChange={setName}
				required
			/>
			<div className="space-y-1">
				<InlineValidation
					label="Email"
					type="email"
					value={email}
					onChange={setEmail}
					validate={(v) =>
						/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || v.length === 0
							? null
							: "Enter a valid email address"
					}
				/>
			</div>
			{error && (
				<p role="alert" className="text-sm text-destructive">
					{error}
				</p>
			)}
			<LoadingButton
				onAction={async () => {
					const ok = await handleSubmit(
						new Event("submit") as unknown as React.FormEvent,
					);
					if (!ok) throw new Error("booking failed");
				}}
				disabled={isSubmitting}
				className="w-full min-h-[44px]"
			>
				Book
			</LoadingButton>
		</form>
	);
}
