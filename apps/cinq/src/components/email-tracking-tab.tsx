import { useGetContactTracking, useTrackEmail } from "@ataqu/api-client";
import type { UUID } from "@ataqu/types";
import { Badge, Button, Skeleton } from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import { format } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";

interface TrackingEvent {
	id: UUID;
	event_type: string;
	created_at: string;
	// other fields not needed
}

export function EmailTrackingTab({ contactId }: { contactId: UUID }) {
	const { data, isLoading } = useGetContactTracking(contactId, { limit: 50 });
	const trackEmail = useTrackEmail({
		onSuccess: () => toast.success("Email event tracked."),
		onError: () => toast.error("Failed to track event"),
	});
	const [eventType, setEventType] = useState<"send" | "open" | "click">("send");

	if (isLoading) return <Skeleton className="h-32 w-full" />;

	const events = (data?.items as TrackingEvent[]) || [];

	return (
		<div className="space-y-4">
			<div className="flex items-end gap-2 rounded-md border border-border p-3">
				<div>
					<label className="text-xs text-muted-foreground">
						<Trans>Event type</Trans>
					</label>
					<select
						value={eventType}
						onChange={(e) =>
							setEventType(e.target.value as "send" | "open" | "click")
						}
						className="h-9 w-40 rounded-md border border-input bg-background px-2 text-sm"
					>
						<option value="send">Send</option>
						<option value="open">Open</option>
						<option value="click">Click</option>
					</select>
				</div>
				<Button
					size="sm"
					disabled={trackEmail.isPending}
					onClick={() =>
						trackEmail.mutate({
							contact_id: contactId,
							event_type: eventType,
						})
					}
				>
					<Trans>Track event</Trans>
				</Button>
			</div>
			<div className="overflow-x-auto">
				<table className="w-full text-sm">
					<thead className="border-b border-gray-700">
						<tr>
							<th className="text-left py-2 px-3">
								<Trans>Event</Trans>
							</th>
							<th className="text-left py-2 px-3">
								<Trans>Time</Trans>
							</th>
							<th className="text-left py-2 px-3">
								<Trans>Status</Trans>
							</th>
						</tr>
					</thead>
					<tbody>
						{events.map((e) => (
							<tr key={e.id} className="border-b border-gray-700/50">
								<td className="py-2 px-3">{e.event_type}</td>
								<td className="py-2 px-3">
									{format(new Date(e.created_at), "PPp")}
								</td>
								<td className="py-2 px-3">
									<Badge variant="outline">
										{e.event_type === "opened" ? (
											<Trans>Opened</Trans>
										) : (
											<Trans>Clicked</Trans>
										)}
									</Badge>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}
