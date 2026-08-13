import { useAuthStore } from "@ataqu/shared-stores";
import { useEffect } from "react";

export function useMeetingJoined(bookingId: string | null) {
	const { token } = useAuthStore();

	useEffect(() => {
		if (!bookingId || !token) return;

		const controller = new AbortController();

		// Send POST to indicate user has joined the meeting page
		// This prevents the backend no_show_worker from marking them as no-show
		fetch(`/api/v1/tempo/bookings/${bookingId}/joined`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			signal: controller.signal,
		}).catch((err) => {
			if (err.name !== "AbortError") {
				console.warn("Failed to send meeting joined signal:", err);
			}
		});

		return () => controller.abort();
	}, [bookingId, token]);
}
