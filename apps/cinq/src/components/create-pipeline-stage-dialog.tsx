import { useCreatePipelineStage } from "@ataqu/api-client";
import {
	Bone,
	Button,
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	Input,
	Label,
} from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

export function CreatePipelineStageDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (o: boolean) => void;
}) {
	const queryClient = useQueryClient();
	const [name, setName] = useState("");
	const [order, setOrder] = useState("0");
	const [submitting, setSubmitting] = useState(false);

	const createMutation = useCreatePipelineStage({
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["cinq", "pipeline"] });
			toast.success("Stage created.");
			onOpenChange(false);
			setName("");
			setOrder("0");
		},
		onError: () => toast.error("Create failed"),
	});

	const handleSubmit = () => {
		if (!name) {
			toast.error("Name is required.");
			return;
		}
		setSubmitting(true);
		createMutation
			.mutateAsync({ name, order: Number(order) || 0 })
			.finally(() => setSubmitting(false));
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						<Trans>New Pipeline Stage</Trans>
					</DialogTitle>
				</DialogHeader>
				<Bone
					loading={submitting}
					name="create-stage"
					fallback={<div className="h-32 w-full rounded bg-white/5" />}
				>
					<div className="space-y-3">
						<div>
							<Label>
								<Trans>Name</Trans>
							</Label>
							<Input
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="Qualified"
							/>
						</div>
						<div>
							<Label>
								<Trans>Order</Trans>
							</Label>
							<Input
								value={order}
								onChange={(e) => setOrder(e.target.value)}
								placeholder="0"
								type="number"
							/>
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
