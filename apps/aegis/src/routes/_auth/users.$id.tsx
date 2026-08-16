// apps/aegis/src/routes/_auth/users.$id.tsx

import {
	useDeactivateUser,
	useListUsers,
	useUpdateUserRole,
} from "@ataqu/api-client";
import { handleApiError } from "@ataqu/shared-utils";
import {
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
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Skeleton,
} from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import {
	createFileRoute,
	useNavigate,
	useParams,
} from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
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
				navigate({ to: "/users" });
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

		const [role, setRole] = useState<string>(user?.role ?? "viewer");

		if (isLoading) {
			return (
				<div className="p-6">
					<Skeleton className="h-8 w-32 mb-4" />
					<Skeleton className="h-40 w-full" />
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
					onClick={() => navigate({ to: "/users" })}
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
								<Select value={role} onValueChange={(v) => setRole(v)}>
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
											data: { role },
											version: user?.version ?? 0,
										})
									}
									disabled={updateRole.isPending || role === user.role}
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
								<span className="text-green-500 ml-2">
									<Trans>Active</Trans>
								</span>
							) : (
								<span className="text-red-500 ml-2">
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
								? new Date(user.last_login_at).toLocaleString()
								: "Never"}
						</div>
						<div>
							<strong>
								<Trans>Created:</Trans>
							</strong>{" "}
							{user.created_at
								? new Date(user.created_at).toLocaleString()
								: "—"}
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
										<Trans>Revoke</Trans>
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
