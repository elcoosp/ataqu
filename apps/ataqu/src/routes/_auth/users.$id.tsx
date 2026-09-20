// apps/aegis/src/routes/_auth/users.$id.tsx

import {
	useDeactivateUser,
	useListUsers,
	useUpdateUserRole,
} from "@ataqu/api-client";
import { formatDateTime, handleApiError } from "@ataqu/shared-utils";
import {
	Bone,
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	HoldToConfirm,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import {
	createFileRoute,
	useNavigate,
	useParams,
} from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const ROLES = ["admin", "manager", "employee", "viewer"];

export const Route = createFileRoute("/_auth/users/$id")({
	component: () => {
		const { id } = useParams({ from: "/_auth/users/$id" });
		const navigate = useNavigate();
		const queryClient = useQueryClient();

		const { data: users = [], isLoading, error } = useListUsers();
		const user = users.find((u) => u.id === id);

		const _deactivateMutation = useDeactivateUser({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: ["aegis", "users"] });
				toast.success("User deactivated.");
				navigate({
					to: "/users",
					search: { inviteOpen: false, createOpen: false },
				});
			},
			onError: (_err: any) => {
				toast.error("Failed to deactivate");
			},
		});

		const updateRole = useUpdateUserRole({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: ["aegis", "users"] });
				toast.success("Role updated.");
			},
			onError: () =>
				toast.error(handleApiError(error ?? new Error("update failed"))),
		});

		// Seeded from the loaded user, not the (possibly stale) first render:
		// sync in an effect so the select never shows "viewer" for an admin
		// while the list is still resolving.
		const [role, setRole] = useState<string | null>(null);
		useEffect(() => {
			if (user && role === null) setRole(user.role ?? "viewer");
		}, [user, role]);
		const effectiveRole = role ?? "viewer";
		const saveDisabled =
			updateRole.isPending || !user || effectiveRole === user.role;

		if (isLoading) {
			return (
				<div className="p-6">
					<Bone
						loading
						name="users-$id-1"
						fallback={<div className="h-8 w-32 mb-4" />}
					>
						{null}
					</Bone>
					<Bone
						loading
						name="users-$id-2"
						fallback={<div className="h-40 w-full" />}
					>
						{null}
					</Bone>
				</div>
			);
		}

		if (error || !user) {
			return <div>User not found.</div>;
		}

		return (
			<div className="p-6">
				<Button
					variant="ghost"
					onClick={() =>
						navigate({
							to: "/users",
							search: { inviteOpen: false, createOpen: false },
						})
					}
					className="mb-4"
				>
					<ArrowLeft className="mr-2 h-4 w-4" />
					<Trans>Back to Users</Trans>
				</Button>
				<Card>
					<CardHeader>
						<CardTitle>{user.name || user.email}</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						<div>
							<strong>
								<Trans>Email:</Trans>
							</strong>{" "}
							{user.email}
						</div>
						<div>
							<strong>
								<Trans>Role:</Trans>
							</strong>{" "}
							<div className="mt-1 flex items-center gap-2">
								<Select value={effectiveRole} onValueChange={(v) => setRole(v)}>
									<SelectTrigger className="w-48">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{ROLES.map((r) => (
											<SelectItem key={r} value={r}>
												{r}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<Button
									size="sm"
									onClick={() =>
										updateRole.mutate({
											userId: id,
											data: { role: effectiveRole },
											version: user?.version ?? 0,
										})
									}
									disabled={saveDisabled}
								>
									<Trans>Save Role</Trans>
								</Button>
							</div>
						</div>
						<div>
							<strong>
								<Trans>Status:</Trans>
							</strong>{" "}
							{user.is_active ? (
								<span className="text-success ml-2">
									<Trans>Active</Trans>
								</span>
							) : (
								<span className="text-destructive ml-2">
									<Trans>Inactive</Trans>
								</span>
							)}
						</div>
						<div>
							<strong>
								<Trans>MFA Enabled:</Trans>
							</strong>{" "}
							{user.mfa_enabled ? "Yes" : "No"}
						</div>
						<div>
							<strong>
								<Trans>Last Login:</Trans>
							</strong>{" "}
							{user.last_login_at
								? formatDateTime(user.last_login_at)
								: "Never"}
						</div>
						<div>
							<strong>
								<Trans>Created:</Trans>
							</strong>{" "}
							{user.created_at ? formatDateTime(user.created_at) : "—"}
						</div>

						{user.is_active && (
							<Dialog>
								<DialogTrigger asChild>
									<Button variant="destructive">
										<Trans>Revoke Access</Trans>
									</Button>
								</DialogTrigger>
								<DialogContent>
									<DialogHeader>
										<DialogTitle>
											<Trans>Revoke Access</Trans>
										</DialogTitle>
										<DialogDescription>
											<Trans>
												This will deactivate the user and revoke all sessions.
												This action can be undone by an admin.
											</Trans>
										</DialogDescription>
									</DialogHeader>
									<DialogFooter>
										<HoldToConfirm
											onConfirm={() => _deactivateMutation.mutate(user.id)}
											confirmLabel="Revoked"
											disabled={_deactivateMutation.isPending}
											className="w-full bg-destructive text-white hover:bg-destructive"
										>
											<Trans>Revoke access</Trans>
										</HoldToConfirm>
									</DialogFooter>
								</DialogContent>
							</Dialog>
						)}
					</CardContent>
				</Card>
			</div>
		);
	},
});
