import { useGetContact } from "@ataqu/api-client";
import { Skeleton, Tabs, TabsContent, TabsList, TabsTrigger } from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import { ActivityTimeline } from "../components/activity-timeline";
import { CustomFieldsTab } from "../components/custom-fields-tab";
import { EmailTrackingTab } from "../components/email-tracking-tab";
import { TaskList } from "../components/task-list";

export const Route = createFileRoute("/_auth/contacts/$id")({
	component: ContactDetail,
});

function ContactDetail() {
	const { id } = Route.useParams();
	const { data: contact, isLoading } = useGetContact(id);

	if (isLoading) return <Skeleton className="h-64 w-full" />;
	if (!contact)
		return (
			<div>
				<Trans>Contact not found</Trans>
			</div>
		);

	return (
		<div className="p-4">
			<h1 className="text-2xl font-bold">{contact.name}</h1>
			<p>{contact.email}</p>
			<p>{contact.phone}</p>

			<Tabs defaultValue="activities" className="mt-4">
				<TabsList>
					<TabsTrigger value="activities">
						<Trans>Activities</Trans>
					</TabsTrigger>
					<TabsTrigger value="tasks">
						<Trans>Tasks</Trans>
					</TabsTrigger>
					<TabsTrigger value="customFields">
						<Trans>Custom Fields</Trans>
					</TabsTrigger>
					<TabsTrigger value="tracking">
						<Trans>Email Tracking</Trans>
					</TabsTrigger>
				</TabsList>
				<TabsContent value="activities">
					<ActivityTimeline dealId={id} />
				</TabsContent>
				<TabsContent value="tasks">
					<TaskList />
				</TabsContent>
				<TabsContent value="customFields">
					<CustomFieldsTab contact={contact} />
				</TabsContent>
				<TabsContent value="tracking">
					<EmailTrackingTab contactId={id} />
				</TabsContent>
			</Tabs>
		</div>
	);
}
