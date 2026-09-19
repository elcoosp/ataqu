import {
	approveLeaveRequest,
	type LeaveRequest,
	type PaginatedResponse,
	rejectLeaveRequest,
	useCancelLeaveRequest,
	useListLeaveRequests,
} from "@ataqu/api-client";
import { useOptimisticMutation } from "@ataqu/shared-hooks";
import { Badge, Button, DataTable, HoldToConfirm } from "@ataqu/ui";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import type { ColumnDef } from "@tanstack/react-table";
import { Check, X } from "lucide-react";
import { toast } from "sonner";

type LeaveCache = PaginatedResponse<LeaveRequest> | undefined;
type LeaveVars = { id: string; version: number };

/** Paint a status change onto the cached leave-request list. */
const setStatus =
	(status: LeaveRequest["status"]) =>
	(old: LeaveCache, { id }: LeaveVars): LeaveCache =>
		old
			? {
					...old,
					items: old.items.map((req) =>
						req.id === id ? { ...req, status } : req,
					),
				}
			: old;

export function ApprovalDashboard() {
	const { data: requests, isLoading } = useListLeaveRequests();

	const approveMutation = useOptimisticMutation<void, LeaveCache, LeaveVars>({
		listQueryKey: ["pause", "leave-requests"],
		mutationFn: ({ id, version }) =>
			approveLeaveRequest(id, version).then(() => undefined),
		optimisticUpdate: setStatus("approved"),
		onError: () => toast.error(t`Failed to approve leave.`),
		onSuccess: () => toast.success(t`Leave approved.`),
	});

	const rejectMutation = useOptimisticMutation<void, LeaveCache, LeaveVars>({
		listQueryKey: ["pause", "leave-requests"],
		mutationFn: ({ id, version }) =>
			rejectLeaveRequest(id, version).then(() => undefined),
		optimisticUpdate: setStatus("rejected"),
		onError: () => toast.error(t`Failed to reject leave.`),
		onSuccess: () => toast.success(t`Leave rejected.`),
	});

	const cancelMutation = useCancelLeaveRequest({
		onSuccess: () => {
			toast.success(t`Leave request cancelled.`);
		},
		onError: () => toast.error(t`Failed to cancel leave.`),
	});

	const leaveItems = requests?.items ?? [];
	const columns: ColumnDef<LeaveRequest>[] = [
		{
			accessorKey: "employee_name",
			header: () => <Trans>Employee</Trans>,
		},
		{
			accessorKey: "start_date",
			header: () => <Trans>Start Date</Trans>,
		},
		{
			accessorKey: "end_date",
			header: () => <Trans>End Date</Trans>,
		},
		{
			accessorKey: "leave_type",
			header: () => <Trans>Type</Trans>,
		},
		{
			accessorKey: "status",
			header: () => <Trans>Status</Trans>,
			cell: ({ row }) => {
				const status = row.original.status;
				const color =
					status === "approved"
						? "bg-success/20 text-success"
						: status === "rejected"
							? "bg-destructive/20 text-destructive"
							: "bg-amber/20 text-amber";
				return <Badge className={color}>{status}</Badge>;
			},
		},
		{
			id: "actions",
			header: () => <Trans>Actions</Trans>,
			cell: ({ row }) => {
				const req = row.original;
				return req.status === "pending" ? (
					<div className="flex gap-2">
						<HoldToConfirm
							onConfirm={() =>
								approveMutation.mutate({ id: req.id, version: req.version })
							}
							disabled={approveMutation.isPending}
							className="bg-success text-white hover:bg-success"
						>
							<Button
								size="sm"
								variant="ghost"
								className="h-full w-full"
								disabled={approveMutation.isPending}
							>
								<Check className="h-4 w-4" />
							</Button>
						</HoldToConfirm>
						<HoldToConfirm
							onConfirm={() =>
								rejectMutation.mutate({ id: req.id, version: req.version })
							}
							disabled={rejectMutation.isPending}
							className="bg-destructive text-white hover:bg-destructive"
						>
							<X className="h-4 w-4" />
						</HoldToConfirm>
						<HoldToConfirm
							onConfirm={() =>
								cancelMutation.mutate({ id: req.id, version: req.version })
							}
							disabled={cancelMutation.isPending}
						>
							<Trans>Cancel</Trans>
						</HoldToConfirm>
					</div>
				) : null;
			},
		},
	];

	if (isLoading)
		return (
			<div>
				<Trans>Loading...</Trans>
			</div>
		);

	return (
		<div data-tour="pending-list">
			<DataTable columns={columns} data={leaveItems} />
		</div>
	);
}
