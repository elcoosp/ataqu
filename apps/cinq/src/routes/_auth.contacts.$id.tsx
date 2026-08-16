import { useGetContact, useUpdateContact } from "@ataqu/api-client";
import { handleApiError } from "@ataqu/shared-utils";
import {
	Button,
	Input,
	Label,
	Skeleton,
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@ataqu/ui";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ActivityTimeline } from "../components/activity-timeline";
import { CreateActivityDialog } from "../components/create-activity-dialog";
import { CustomFieldsTab } from "../components/custom-fields-tab";
import { EmailTrackingTab } from "../components/email-tracking-tab";
import { TaskList } from "../components/task-list";

export const Route = createFileRoute("/_auth/contacts/$id")({
	component: ContactDetail,
});

function ContactDetail() {
	const { id } = Route.useParams();
	const { data: contact, isLoading } = useGetContact(id);
	const updateMutation = useUpdateContact({
		onSuccess: () => toast.success(t`Contact updated`),
		onError: (err) => toast.error(handleApiError(err)),
	});

	const [editing, setEditing] = useState(false);
	const [openActivity, setOpenActivity] = useState(false);
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [phone, setPhone] = useState("");
	const [company, setCompany] = useState("");

	if (isLoading) return <Skeleton className="h-64 w-full" />;
	if (!contact)
		return (
			<div>
				<Trans>Contact not found</Trans>
			</div>
		);

	const startEdit = () => {
		setName(contact.name ?? "");
		setEmail(contact.email ?? "");
		setPhone(contact.phone ?? "");
		setCompany(contact.company ?? "");
		setEditing(true);
	};

	const save = () => {
		updateMutation.mutate({
			id: contact.id,
			data: { name, email, phone: phone || null, company: company || null },
			version: contact.version,
		});
		setEditing(false);
	};

	return (
		<div className="p-4">
			<div className="flex items-start justify-between">
				<div>
					<h1 className="text-2xl font-bold">{contact.name}</h1>
					<p>{contact.email}</p>
					<p>{contact.phone}</p>
				</div>
				{!editing && (
					<>
						<Button variant="outline" onClick={startEdit}>
							<Trans>Edit</Trans>
						</Button>
						<Button variant="outline" onClick={() => setOpenActivity(true)}>
							<Trans>Log Activity</Trans>
						</Button>
					</>
				)}
			</div>

			{editing && (
				<div className="mt-4 space-y-3 rounded-lg border border-border p-4">
					<div>
						<Label>
							<Trans>Name</Trans>
						</Label>
						<Input value={name} onChange={(e) => setName(e.target.value)} />
					</div>
					<div>
						<Label>
							<Trans>Email</Trans>
						</Label>
						<Input value={email} onChange={(e) => setEmail(e.target.value)} />
					</div>
					<div>
						<Label>
							<Trans>Phone</Trans>
						</Label>
						<Input value={phone} onChange={(e) => setPhone(e.target.value)} />
					</div>
					<div>
						<Label>
							<Trans>Company</Trans>
						</Label>
						<Input
							value={company}
							onChange={(e) => setCompany(e.target.value)}
						/>
					</div>
					<div className="flex gap-2">
						<Button onClick={save} disabled={updateMutation.isPending}>
							<Trans>Save</Trans>
						</Button>
						<Button variant="ghost" onClick={() => setEditing(false)}>
							<Trans>Cancel</Trans>
						</Button>
					</div>
				</div>
			)}

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
			<CreateActivityDialog
				open={openActivity}
				onOpenChange={setOpenActivity}
				defaultContactId={id}
			/>
		</div>
	);
}
