// apps/aegis/src/components/create-api-key-dialog.tsx

import { api } from "@ataqu/api-client";
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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

interface CreateApiKeyDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function CreateApiKeyDialog({
	open,
	onOpenChange,
}: CreateApiKeyDialogProps) {
	const queryClient = useQueryClient();
	const { register, handleSubmit, reset } = useForm<{ name: string }>();
	const [newKey, setNewKey] = useState<string | null>(null);

	const createMutation = useMutation({
		mutationFn: (data: { name: string }) =>
			api.post<{ id: string; key: string }>(
				"/aegis/api-keys",
				{ name: data.name, scopes: [], expires_at: null },
				{ headers: { "Idempotency-Key": crypto.randomUUID() } },
			),
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: ["aegis", "api-keys"] });
			setNewKey(data.key);
			toast.success(<Trans>API key created.</Trans>);
			reset();
		},
		onError: (err: any) => {
			toast.error(err.message || <Trans>Create failed</Trans>);
		},
	});

	const handleClose = () => {
		setNewKey(null);
		onOpenChange(false);
	};

	if (newKey) {
		return (
			<Dialog open={true} onOpenChange={handleClose}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							<Trans>API Key Created</Trans>
						</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						<div className="bg-muted p-3 rounded relative">
							<code className="text-sm break-all">{newKey}</code>
							<Button
								size="sm"
								variant="ghost"
								className="absolute right-2 top-2"
								onClick={() => {
									navigator.clipboard.writeText(newKey);
									toast.success(<Trans>Copied!</Trans>);
								}}
							>
								<Trans>Copy</Trans>
							</Button>
						</div>
						<p className="text-sm text-muted-foreground">
							<Trans>
								Copy this key now. You won't be able to see it again.
							</Trans>
						</p>
						<Button onClick={handleClose} className="w-full">
							<Trans>Done</Trans>
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		);
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						<Trans>Create API Key</Trans>
					</DialogTitle>
				</DialogHeader>
				<form
					onSubmit={handleSubmit((data) => createMutation.mutate(data))}
					className="space-y-4"
				>
					<div>
						<Label htmlFor="name">
							<Trans>Name</Trans>
						</Label>
						<Input
							id="name"
							{...register("name", { required: true })}
							placeholder="My App Key"
						/>
					</div>
					<div className="flex justify-end gap-2">
						<Button
							variant="outline"
							type="button"
							onClick={() => onOpenChange(false)}
						>
							<Trans>Cancel</Trans>
						</Button>
						<Button type="submit" disabled={createMutation.isPending}>
							{createMutation.isPending ? (
								<Trans>Creating...</Trans>
							) : (
								<Trans>Create</Trans>
							)}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
