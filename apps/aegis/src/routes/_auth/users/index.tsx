// apps/aegis/src/routes/_auth/users/index.tsx

import {
	Bone,
	Button,
	Card,
	CardContent,
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	Input,
	Label,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@ataqu/ui";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { EmptyState } from "../../../components/empty-state";

("../../components/empty-state");

import { useCreateUser, useInviteUser, useListUsers } from "@ataqu/api-client";
import { Trans } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

export const Route = createFileRoute("/_auth/users/")({
	component: () => {
		const navigate = useNavigate();
		const queryClient = useQueryClient();

		const [openInvite, setOpenInvite] = useState(false);
		const [openCreate, setOpenCreate] = useState(false);

		const _createUserMutation = useCreateUser({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: ["aegis", "users"] });
				setOpenCreate(false);
				toast.success("User created.");
			},
			onError: () => toast.error("Create failed"),
		});

		const { data: users, isLoading, error } = useListUsers();

		const inviteMutation = useInviteUser({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: ["aegis", "users"] });
				setOpenInvite(false);
				toast.success("User invited.");
			},
			onError: (_err: any) => {
				toast.error("Invite failed");
			},
		});

		const {
			register: _register,
			handleSubmit: _handleSubmit,
			reset: _reset,
		} = useForm<{
			email: string;
			role: string;
		}>({
			defaultValues: { role: "member" },
		});

		if (isLoading) {
			return (
				<div className="p-6">
					<Bone
						loading
						name="index-1"
						fallback={<div className="h-10 w-48 mb-4" />}
					>
						{null}
					</Bone>
					<Bone
						loading
						name="index-2"
						fallback={<div className="h-64 w-full" />}
					>
						{null}
					</Bone>
				</div>
			);
		}

		if (error) {
			return <div>Error loading users.</div>;
		}

		const userList = users || [];

		if (userList.length === 0) {
			return (
				<div className="p-6">
					<EmptyState
						icon={Users}
						title="No users yet"
						description="Invite your team. One login, 10 apps."
						ctaLabel="Invite User"
						onCta={() => setOpenInvite(true)}
					/>
					<InviteDialog
						open={openInvite}
						onOpenChange={setOpenInvite}
						onSubmit={(data) => inviteMutation.mutate(data)}
						isPending={inviteMutation.isPending}
					/>
				</div>
			);
		}

		return (
			<div className="p-6">
				<div className="flex justify-between items-center mb-6">
					<h1 className="text-2xl font-heading">
						<Trans>Users</Trans>
					</h1>
					<Button onClick={() => setOpenInvite(true)}>
						<UserPlus className="mr-2 h-4 w-4" />
						<Trans>Invite User</Trans>
					</Button>
					<Button variant="outline" onClick={() => setOpenCreate(true)}>
						<UserPlus className="mr-2 h-4 w-4" />
						<Trans>Create User</Trans>
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
										<Trans>Email</Trans>
									</TableHead>
									<TableHead>
										<Trans>Role</Trans>
									</TableHead>
									<TableHead>
										<Trans>Status</Trans>
									</TableHead>
									<TableHead>
										<Trans>Last Active</Trans>
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{userList.map((user) => (
									<TableRow
										key={user.id}
										className="cursor-pointer hover:bg-muted/50"
										onClick={() => navigate({ to: `/users/${user.id}` })}
									>
										<TableCell>{user.name || "—"}</TableCell>
										<TableCell>{user.email}</TableCell>
										<TableCell>{user.role}</TableCell>
										<TableCell>
											{user.is_active ? (
												<span className="text-green-500">
													<Trans>Active</Trans>
												</span>
											) : (
												<span className="text-red-500">
													<Trans>Inactive</Trans>
												</span>
											)}
										</TableCell>
										<TableCell>
											{user.last_login_at
												? new Date(user.last_login_at).toLocaleDateString()
												: "—"}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</CardContent>
				</Card>

				<InviteDialog
					open={openInvite}
					onOpenChange={setOpenInvite}
					onSubmit={(data) => inviteMutation.mutate(data)}
					isPending={inviteMutation.isPending}
				/>
				<CreateUserDialog open={openCreate} onOpenChange={setOpenCreate} />
			</div>
		);
	},
});

// Invite dialog component
function InviteDialog({
	open,
	onOpenChange,
	onSubmit,
	isPending,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (data: { email: string; role: string }) => void;
	isPending: boolean;
}) {
	const { register, handleSubmit, reset } = useForm<{
		email: string;
		role: string;
	}>({
		defaultValues: { role: "member" },
	});

	const handleClose = () => {
		reset();
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						<Trans>Invite User</Trans>
					</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
							<option value="admin">Admin</option>
							<option value="member">Member</option>
							<option value="viewer">Viewer</option>
						</select>
					</div>
					<div className="flex justify-end gap-2">
						<Button variant="outline" type="button" onClick={handleClose}>
							<Trans>Cancel</Trans>
						</Button>
						<Button type="submit" disabled={isPending}>
							{isPending ? <Trans>Inviting...</Trans> : <Trans>Invite</Trans>}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}

// Create user dialog component
function CreateUserDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [name, setName] = useState("");
	useListUsers();
	const queryClient = useQueryClient();

	const createUserMutation = useCreateUser({
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["aegis", "users"] });
			onOpenChange(false);
			setEmail("");
			setPassword("");
			setName("");
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!email || !password) return;
		createUserMutation.mutate({
			email,
			password,
			name: name || undefined,
		});
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						<Trans>Create User</Trans>
					</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<Label htmlFor="cu-name">
							<Trans>Name</Trans>
						</Label>
						<Input
							id="cu-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
						/>
					</div>
					<div>
						<Label htmlFor="cu-email">
							<Trans>Email</Trans>
						</Label>
						<Input
							id="cu-email"
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
						/>
					</div>
					<div>
						<Label htmlFor="cu-password">
							<Trans>Password</Trans>
						</Label>
						<Input
							id="cu-password"
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
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
						<Button type="submit" disabled={createUserMutation.isPending}>
							<Trans>Create</Trans>
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
