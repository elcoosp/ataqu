import { useGetEventType } from "@ataqu/api-client";
import { Button, Input, Shell, Skeleton } from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import { EventTypeForm } from "@/components/event-type-form";
import { toast } from "@/hooks/use-toast";

export const Route = createFileRoute("/_auth/event-types/$id")({
	component: EventTypeDetail,
});

function EventTypeDetail() {
	const { id } = Route.useParams();
	const { data: eventType, isLoading } = useGetEventType(id);

	const handleCopyLink = () => {
		if (!eventType) return;
		const link = `https://ataqu.com/book/${eventType.slug}`;
		navigator.clipboard.writeText(link).then(() => {
			toast.success("Booking link copied.");
		});
	};

	if (isLoading) {
		return (
			<Shell activeApp="tempo">
				<Skeleton className="h-64 w-full" />
			</Shell>
		);
	}

	if (!eventType) {
		return (
			<Shell activeApp="tempo">
				<p className="text-muted-foreground">
					<Trans>Event type not found.</Trans>
				</p>
			</Shell>
		);
	}

	return (
		<Shell activeApp="tempo">
			<div className="space-y-6">
				<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
					<h1 className="text-2xl font-heading font-bold text-foreground">
						{eventType.name}
					</h1>
					<div className="flex gap-2 items-center w-full sm:w-auto">
						<Input
							value={`https://ataqu.com/book/${eventType.slug}`}
							readOnly
							className="w-full sm:w-64 font-mono text-xs"
						/>
						<Button variant="outline" onClick={handleCopyLink}>
							<Trans>Copy Link</Trans>
						</Button>
					</div>
				</div>

				<EventTypeForm eventType={eventType} />
			</div>
		</Shell>
	);
}
