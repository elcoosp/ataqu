import { useCreateChannel } from "@ataqu/api-client";
import {
	Button,
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	Input,
	Label,
} from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function CreateChannelDialog() {
	const [open, setOpen] = useState(false);
	const [name, setName] = useState("");
	const [channelType, setChannelType] = useState<"public" | "private">(
		"public",
	);
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		const handler = () => setOpen(true);
		window.addEventListener("openCreateChannelDialog", handler);
		return () => window.removeEventListener("openCreateChannelDialog", handler);
	}, []);

	const createChannel = useCreateChannel({
		onSuccess: () => {
			toast.success("Channel created.");
			setOpen(false);
			setName("");
		},
		onError: () => toast.error("Channel creation failed."),
	});

	const handleSubmit = () => {
		if (!name.trim()) {
			toast.error("Channel name is required.");
			return;
		}
		setSubmitting(true);
		createChannel
			.mutateAsync({
				name: name.trim(),
				channel_type: channelType,
			})
			.finally(() => setSubmitting(false));
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						<Trans>Create Channel</Trans>
					</DialogTitle>
				</DialogHeader>
				<div className="space-y-3">
					<div>
						<Label>
							<Trans>Name</Trans>
						</Label>
						<Input
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="general"
						/>
					</div>
					<div>
						<Label>
							<Trans>Type</Trans>
						</Label>
						<div className="flex gap-2">
							<Button
								type="button"
								size="sm"
								variant={channelType === "public" ? "default" : "outline"}
								onClick={() => setChannelType("public")}
							>
								<Trans>Public</Trans>
							</Button>
							<Button
								type="button"
								size="sm"
								variant={channelType === "private" ? "default" : "outline"}
								onClick={() => setChannelType("private")}
							>
								<Trans>Private</Trans>
							</Button>
						</div>
					</div>
					<div className="flex justify-end gap-2 pt-2">
						<Button variant="outline" onClick={() => setOpen(false)}>
							<Trans>Cancel</Trans>
						</Button>
						<Button onClick={handleSubmit} disabled={submitting}>
							<Trans>Create</Trans>
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
