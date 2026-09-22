import { useGetEventType } from "@ataqu/api-client";
import { Bone, Button, Input, PageHeader } from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { EventTypeForm } from "../../../../apps/tempo/components/event-type-form";

export const Route = createFileRoute("/_auth/tempo/event-types/$id")({
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
			<Bone
				loading
				name="_auth-event-types-$id-1"
				fallback={<div className="h-64 w-full" />}
			>
				{null}
			</Bone>
		);
	}

	if (!eventType) {
		return (
			<p className="text-muted-foreground">
				<Trans>Event type not found.</Trans>
			</p>
		);
	}

	return (
		<div className="space-y-6">
			<PageHeader
				title={eventType.name}
				breadcrumbs={[
					{ label: "TEMPO", to: "/tempo/dashboard" },
					{ label: eventType.name },
				]}
				actions={
					<>
						<Button variant="outline" asChild>
							<Link
								to="/tempo/availability"
								search={{ eventType: eventType.id }}
							>
								<Trans>Manage availability</Trans>
							</Link>
						</Button>
						<Input
							value={`https://ataqu.com/book/${eventType.slug}`}
							readOnly
							className="w-full font-mono text-xs sm:w-64"
							aria-label="Booking link"
						/>
						<Button variant="outline" onClick={handleCopyLink}>
							<Trans>Copy Link</Trans>
						</Button>
					</>
				}
			/>

			<EventTypeForm eventType={eventType} />
		</div>
	);
}
