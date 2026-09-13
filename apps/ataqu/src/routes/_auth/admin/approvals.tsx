// apps/aegis/src/routes/_auth/admin/approvals.tsx
import {
	useApproveWorkflow,
	useListPendingApprovals,
	useRejectWorkflow,
} from "@ataqu/api-client";
import {
	Bone,
	Button,
	Card,
	CardContent,
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
import { Check, X } from "lucide-react";

export const Route = createFileRoute("/_auth/admin/approvals")({
	component: ApprovalsPage,
});

function ApprovalsPage() {
	const queryClient = useQueryClient();
	const { data, isLoading, isError } = useListPendingApprovals();
	const approve = useApproveWorkflow({
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: ["aegis", "approvals"] }),
	});
	const reject = useRejectWorkflow({
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: ["aegis", "approvals"] }),
	});

	if (isLoading)
		return (
			<div className="p-6">
				<Bone
					loading
					name="approvals-1"
					fallback={<div className="h-10 w-48 mb-4" />}
				>
					{null}
				</Bone>
				<Bone
					loading
					name="approvals-2"
					fallback={<div className="h-64 w-full" />}
				>
					{null}
				</Bone>
			</div>
		);

	if (isError) return <div className="p-6">Error loading approvals.</div>;

	const approvals = data ?? [];

	return (
		<div className="p-6">
			<h1 className="mb-4 text-2xl font-heading">
				<Trans>Pending Approvals</Trans>
			</h1>

			<Card>
				<CardContent className="overflow-x-auto p-0">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>
									<Trans>Workflow</Trans>
								</TableHead>
								<TableHead>
									<Trans>Run</Trans>
								</TableHead>
								<TableHead>
									<Trans>Role</Trans>
								</TableHead>
								<TableHead>
									<Trans>Created</Trans>
								</TableHead>
								<TableHead>
									<Trans>Actions</Trans>
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{approvals.length === 0 ? (
								<TableRow>
									<TableCell
										colSpan={5}
										className="text-center text-muted-foreground"
									>
										No pending approvals.
									</TableCell>
								</TableRow>
							) : (
								approvals.map((a) => (
									<TableRow key={a.id}>
										<TableCell className="font-mono text-xs">
											{a.workflow_id}
										</TableCell>
										<TableCell className="font-mono text-xs">
											{a.run_id}
										</TableCell>
										<TableCell>{a.approver_role}</TableCell>
										<TableCell>
											{new Date(a.created_at).toLocaleString()}
										</TableCell>
										<TableCell>
											<div className="flex gap-2">
												<Button
													size="sm"
													onClick={() => approve.mutate({ run_id: a.run_id })}
													disabled={approve.isPending}
												>
													<Check className="mr-1 h-4 w-4" />
													<Trans>Approve</Trans>
												</Button>
												<Button
													size="sm"
													variant="outline"
													onClick={() => reject.mutate({ run_id: a.run_id })}
													disabled={reject.isPending}
												>
													<X className="mr-1 h-4 w-4" />
													<Trans>Reject</Trans>
												</Button>
											</div>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</div>
	);
}
