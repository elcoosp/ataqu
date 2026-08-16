import { useCreateTask, useListContacts } from "@ataqu/api-client";
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

export function CreateTaskDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (o: boolean) => void;
}) {
	const queryClient = useQueryClient();
	const { data: contacts } = useListContacts({ limit: 1000 });
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [contactId, setContactId] = useState("");
	const [submitting, setSubmitting] = useState(false);

	const createMutation = useCreateTask({
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["cinq", "tasks"] });
			toast.success("Task created.");
			onOpenChange(false);
			setTitle("");
			setDescription("");
			setContactId("");
		},
		onError: () => toast.error("Create failed"),
	});

	const handleSubmit = () => {
		if (!title) {
			toast.error("Title is required.");
			return;
		}
		setSubmitting(true);
		createMutation
			.mutateAsync({
				title,
				description: description || undefined,
				contact_id: contactId || undefined,
			})
			.finally(() => setSubmitting(false));
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						<Trans>New Task</Trans>
					</DialogTitle>
				</DialogHeader>
				<Bone
					loading={submitting}
					name="create-task"
					fallback={<div className="h-40 w-full rounded bg-white/5" />}
				>
					<div className="space-y-3">
						<div>
							<Label>
								<Trans>Title</Trans>
							</Label>
							<Input
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								placeholder="Follow up call"
							/>
						</div>
						<div>
							<Label>
								<Trans>Description</Trans>
							</Label>
							<Input
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								placeholder="Optional"
							/>
						</div>
						<div>
							<Label>
								<Trans>Contact</Trans>
							</Label>
							<Select value={contactId} onValueChange={setContactId}>
								<SelectTrigger>
									<SelectValue placeholder="Optional" />
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
						<div className="flex justify-end gap-2 pt-2">
							<Button variant="outline" onClick={() => onOpenChange(false)}>
								<Trans>Cancel</Trans>
							</Button>
							<Button onClick={handleSubmit} disabled={submitting}>
								<Trans>Create</Trans>
							</Button>
						</div>
					</div>
				</Bone>
			</DialogContent>
		</Dialog>
	);
}
