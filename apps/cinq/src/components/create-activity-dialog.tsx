import { useCreateActivity, useListContacts } from "@ataqu/api-client";
import {
	Bone,
	Button,
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	Input,
	Label,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

const ACTIVITY_TYPES = ["call", "email", "meeting", "task", "note"] as const;

export function CreateActivityDialog({
	open,
	onOpenChange,
	defaultContactId,
}: {
	open: boolean;
	onOpenChange: (o: boolean) => void;
	defaultContactId?: string;
}) {
	const queryClient = useQueryClient();
	const { data: contacts } = useListContacts({ limit: 1000 });
	const [contactId, setContactId] = useState(defaultContactId ?? "");
	const [activityType, setActivityType] =
		useState<(typeof ACTIVITY_TYPES)[number]>("call");
	const [description, setDescription] = useState("");
	const [submitting, setSubmitting] = useState(false);

	const createMutation = useCreateActivity({
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["cinq", "activities"] });
			toast.success("Activity logged.");
			onOpenChange(false);
			setContactId("");
			setDescription("");
		},
		onError: () => toast.error("Create failed"),
	});

	const handleSubmit = () => {
		if (!contactId || !description) {
			toast.error("Contact and description are required.");
			return;
		}
		setSubmitting(true);
		createMutation
			.mutateAsync({
				contact_id: contactId,
				activity_type: activityType,
				description,
			})
			.finally(() => setSubmitting(false));
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						<Trans>Log Activity</Trans>
					</DialogTitle>
				</DialogHeader>
				<Bone
					loading={submitting}
					name="create-activity"
					fallback={<div className="h-40 w-full rounded bg-white/5" />}
				>
					<div className="space-y-3">
						<div>
							<Label>
								<Trans>Contact</Trans>
							</Label>
							<Select value={contactId} onValueChange={setContactId}>
								<SelectTrigger>
									<SelectValue placeholder="Select contact" />
								</SelectTrigger>
								<SelectContent>
									{(contacts || []).map((c) => (
										<SelectItem key={c.id} value={c.id}>
											{c.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label>
								<Trans>Type</Trans>
							</Label>
							<Select
								value={activityType}
								onValueChange={(v) =>
									setActivityType(v as (typeof ACTIVITY_TYPES)[number])
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{ACTIVITY_TYPES.map((t) => (
										<SelectItem key={t} value={t}>
											{t}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label>
								<Trans>Description</Trans>
							</Label>
							<Input
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								placeholder="Discussed renewal"
							/>
						</div>
						<div className="flex justify-end gap-2 pt-2">
							<Button variant="outline" onClick={() => onOpenChange(false)}>
								<Trans>Cancel</Trans>
							</Button>
							<Button onClick={handleSubmit} disabled={submitting}>
								<Trans>Log</Trans>
							</Button>
						</div>
					</div>
				</Bone>
			</DialogContent>
		</Dialog>
	);
}
