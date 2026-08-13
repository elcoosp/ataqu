// apps/aegis/src/routes/_auth/roles.tsx

import { api } from "@ataqu/api-client";
import {
	Button,
	Card,
	CardContent,
	Skeleton,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Shield } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { CreateRoleDialog } from "../../components/create-role-dialog";
import { EmptyState } from "../../components/empty-state";

export const Route = createFileRoute("/_auth/roles")({
	component: () => {
		const queryClient = useQueryClient();

		const [openCreate, setOpenCreate] = useState(false);

		const {
			data: roles,
			isLoading,
			error,
		} = useQuery({
			queryKey: ["aegis", "roles"],
			queryFn: () =>
				api.get<
					Array<{
						id: string;
						name: string;
						permissions: string[];
						created_at: string;
					}>
				>("/aegis/roles"),
		});

		const _createMutation = useMutation({
			mutationFn: (data: { name: string; permissions: string[] }) =>
				api.post("/aegis/roles", data, {
					headers: { "Idempotency-Key": crypto.randomUUID() },
				}),
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: ["aegis", "roles"] });
				setOpenCreate(false);
				toast.success("Role created.");
			},
			onError: (_err: any) => {
				toast.error("Create failed");
			},
		});

		if (isLoading) {
			return (
				<div className="p-6">
					<Skeleton className="h-10 w-48 mb-4" />
					<Skeleton className="h-64 w-full" />
				</div>
			);
		}

		if (error) {
			return <div>Error loading roles.</div>;
		}

		const roleList = roles || [];

		if (roleList.length === 0) {
			return (
				<div className="p-6">
					<EmptyState
						icon={Shield}
						title="No roles yet"
						description="Create custom roles to fine-tune permissions."
						ctaLabel="Create Role"
						onCta={() => setOpenCreate(true)}
					/>
					<CreateRoleDialog open={openCreate} onOpenChange={setOpenCreate} />
				</div>
			);
		}

		return (
			<div className="p-6">
				<div className="flex justify-between items-center mb-6">
					<h1 className="text-2xl font-heading">
						<Trans>Roles</Trans>
					</h1>
					<Button onClick={() => setOpenCreate(true)}>
						<Plus className="mr-2 h-4 w-4" />
						<Trans>Create Role</Trans>
					</Button>
				</div>
				<Card>
					<CardContent className="p-0">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>
										<Trans>Name</Trans>
									</TableHead>
									<TableHead>
										<Trans>Permissions</Trans>
									</TableHead>
									<TableHead>
										<Trans>Created</Trans>
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{roleList.map((role) => (
									<TableRow key={role.id}>
										<TableCell className="font-medium">{role.name}</TableCell>
										<TableCell>{role.permissions.join(", ") || "—"}</TableCell>
										<TableCell>
											{new Date(role.created_at).toLocaleDateString()}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</CardContent>
				</Card>

				<CreateRoleDialog open={openCreate} onOpenChange={setOpenCreate} />
			</div>
		);
	},
});

// Create role dialog
