import { useCreateChannel } from "@ataqu/api-client";
import { useIntent } from "@ataqu/shared-stores";
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
import { useState } from "react";
import { toast } from "sonner";

export function CreateChannelDialog() {
	const [open, setOpen] = useState(false);
	const [name, setName] = useState("");
	const [channelType, setChannelType] = useState<"public" | "private">(
		"public",
	);
	const [submitting, setSubmitting] = useState(false);

	// Palette commands ("Create Channel" / "Create Private Channel") open this
	// dialog through the typed intent bus, pre-selecting the visibility
	// (brainstorm P2-2 — the private variant previously dispatched an event
	// that no listener matched, so it did nothing).
	useIntent("dial", "channel.create", (payload) => {
		setChannelType(payload?.public === false ? "private" : "public");
		setOpen(true);
	});

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
				<form
					className="space-y-3"
					onSubmit={(e) => {
						e.preventDefault();
						handleSubmit();
					}}
				>
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
						<Button
							variant="outline"
							type="button"
							onClick={() => setOpen(false)}
						>
							<Trans>Cancel</Trans>
						</Button>
						<Button type="submit" disabled={submitting}>
							<Trans>Create</Trans>
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
