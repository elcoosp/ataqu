// apps/aegis/src/components/invite-dialog.tsx

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
import { useForm } from "react-hook-form";
import { toast } from "sonner";

interface InviteDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

interface InviteFormData {
	email: string;
	role: string;
}

export function InviteDialog({ open, onOpenChange }: InviteDialogProps) {
	const queryClient = useQueryClient();
	const { register, handleSubmit, reset } = useForm<InviteFormData>({
		defaultValues: { role: "member" },
	});

	const inviteMutation = useMutation({
		mutationFn: (data: InviteFormData) =>
			api.post("/aegis/users/invite", data, {
				headers: { "Idempotency-Key": crypto.randomUUID() },
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["aegis", "users"] });
			onOpenChange(false);
			toast.success(<Trans>User invited.</Trans>);
			reset();
		},
		onError: (err: any) => {
			toast.error(err.message || <Trans>Invite failed</Trans>);
		},
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						<Trans>Invite User</Trans>
					</DialogTitle>
				</DialogHeader>
				<form
					onSubmit={handleSubmit((data) => inviteMutation.mutate(data))}
					className="space-y-4"
				>
					<div>
						<Label htmlFor="email">
							<Trans>Email</Trans>
						</Label>
						<Input
							id="email"
							type="email"
							{...register("email", { required: true })}
						/>
					</div>
					<div>
						<Label htmlFor="role">
							<Trans>Role</Trans>
						</Label>
						<select
							id="role"
							{...register("role")}
							className="w-full p-2 border border-border rounded bg-background"
						>
							<option value="admin">
								<Trans>Admin</Trans>
							</option>
							<option value="member">
								<Trans>Member</Trans>
							</option>
							<option value="viewer">
								<Trans>Viewer</Trans>
							</option>
						</select>
					</div>
					<div className="flex justify-end gap-2">
						<Button
							variant="outline"
							type="button"
							onClick={() => onOpenChange(false)}
						>
							<Trans>Cancel</Trans>
						</Button>
						<Button type="submit" disabled={inviteMutation.isPending}>
							{inviteMutation.isPending ? (
								<Trans>Inviting...</Trans>
							) : (
								<Trans>Invite</Trans>
							)}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
