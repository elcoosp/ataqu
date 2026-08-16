import {
	useCreateDeal,
	useListContacts,
	useListPipelineStages,
} from "@ataqu/api-client";
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

export function CreateDealDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (o: boolean) => void;
}) {
	const queryClient = useQueryClient();
	const { data: contacts } = useListContacts({ limit: 1000 });
	const { data: stages } = useListPipelineStages();
	const [title, setTitle] = useState("");
	const [amount, setAmount] = useState("");
	const [contactId, setContactId] = useState("");
	const [stageId, setStageId] = useState("");
	const [submitting, setSubmitting] = useState(false);

	const createMutation = useCreateDeal({
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["cinq", "deals"] });
			toast.success("Deal created.");
			onOpenChange(false);
			setTitle("");
			setAmount("");
			setContactId("");
			setStageId("");
		},
		onError: () => toast.error("Create failed"),
	});

	const handleSubmit = () => {
		if (!title || !stageId || !contactId) {
			toast.error("Title, contact and stage are required.");
			return;
		}
		setSubmitting(true);
		createMutation
			.mutateAsync({
				title,
				amount: Number(amount) || 0,
				pipeline_stage_id: stageId,
				contact_id: contactId,
			})
			.finally(() => setSubmitting(false));
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						<Trans>New Deal</Trans>
					</DialogTitle>
				</DialogHeader>
				<Bone
					loading={submitting}
					name="create-deal"
					fallback={<div className="h-48 w-full rounded bg-white/5" />}
				>
					<div className="space-y-3">
						<div>
							<Label>
								<Trans>Title</Trans>
							</Label>
							<Input
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								placeholder="Enterprise plan"
							/>
						</div>
						<div>
							<Label>
								<Trans>Amount</Trans>
							</Label>
							<Input
								value={amount}
								onChange={(e) => setAmount(e.target.value)}
								placeholder="5000"
								type="number"
							/>
						</div>
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
								<Trans>Stage</Trans>
							</Label>
							<Select value={stageId} onValueChange={setStageId}>
								<SelectTrigger>
									<SelectValue placeholder="Select stage" />
								</SelectTrigger>
								<SelectContent>
									{(stages || []).map((s) => (
										<SelectItem key={s.id} value={s.id}>
											{s.name}
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
