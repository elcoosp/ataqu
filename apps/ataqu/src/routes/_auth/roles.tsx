// apps/aegis/src/routes/_auth/roles.tsx

import { searchSchema, useUrlState } from "@ataqu/shared-hooks";
import { useCreateRole, useListRoles } from "@ataqu/api-client";
import { formatDate } from "@ataqu/shared-utils";
import {
	Bone,
	Button,
	Card,
	CardContent,
	EmptyState,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Shield } from "lucide-react";
import { toast } from "sonner";
import { CreateRoleDialog } from "../../components/create-role-dialog";

export const Route = createFileRoute("/_auth/roles")({
	// `?createOpen=1` opens the create dialog (brainstorm P1-3), which is what
	// makes the "Create Role" palette command work from any app (P2-2).
	validateSearch: searchSchema({
		createOpen: (raw: unknown) => raw === "1",
	}),
	component: () => {
		const queryClient = useQueryClient();
		const search = Route.useSearch();
		const navigate = Route.useNavigate();

		const [openCreate, setOpenCreate] = useUrlState({
			search,
			setSearch: (next) => navigate({ search: next as never }),
			key: "createOpen",
			default: false,
			parse: (raw: unknown) => raw === "1",
			serialize: (v) => (v ? "1" : undefined),
		});

		const { data, isLoading, error } = useListRoles();

		const _createMutation = useCreateRole({
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
					<Bone
						loading
						name="roles-1"
						fallback={<div className="h-10 w-48 mb-4" />}
					>
						{null}
					</Bone>
					<Bone
						loading
						name="roles-2"
						fallback={<div className="h-64 w-full" />}
					>
						{null}
					</Bone>
				</div>
			);
		}

		if (error) {
			return <div>Error loading roles.</div>;
		}

		const roleList = data || [];

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
										<TableCell>{formatDate(role.created_at)}</TableCell>
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
