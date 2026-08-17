import {
	type LeaveRequest,
	useApproveLeaveRequest,
	useCancelLeaveRequest,
	useListLeaveRequests,
	useRejectLeaveRequest,
} from "@ataqu/api-client";
import { Badge, Button, DataTable, HoldToConfirm } from "@ataqu/ui";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Check, X } from "lucide-react";
import { toast } from "sonner";

interface OptimisticContext {
	previousRequests?: LeaveRequest[];
}

export function ApprovalDashboard() {
	const queryClient = useQueryClient();
	const { data: requests, isLoading } = useListLeaveRequests();

	const approveMutation = useApproveLeaveRequest({
		onMutate: async ({ id }: { id: string; version: number }) => {
			await queryClient.cancelQueries({
				queryKey: ["pause", "leave-requests"],
			});
			const previousRequests = queryClient.getQueryData<LeaveRequest[]>([
				"pause",
				"leave-requests",
			]);
			if (previousRequests) {
				queryClient.setQueryData<LeaveRequest[]>(
					["pause", "leave-requests"],
					previousRequests.map((req) =>
						req.id === id ? { ...req, status: "approved" as const } : req,
					),
				);
			}
			return { previousRequests };
		},
		onError: (
			_err: Error,
			_vars: { id: string; version: number },
			context: unknown,
		) => {
			const ctx = context as OptimisticContext | undefined;
			if (ctx?.previousRequests) {
				queryClient.setQueryData(
					["pause", "leave-requests"],
					ctx.previousRequests,
				);
			}
			toast.error(t`Failed to approve leave.`);
		},
		onSuccess: () => {
			toast.success(t`Leave approved.`);
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: ["pause", "leave-requests"] });
		},
	});

	const rejectMutation = useRejectLeaveRequest({
		onMutate: async ({ id }: { id: string; version: number }) => {
			await queryClient.cancelQueries({
				queryKey: ["pause", "leave-requests"],
			});
			const previousRequests = queryClient.getQueryData<LeaveRequest[]>([
				"pause",
				"leave-requests",
			]);
			if (previousRequests) {
				queryClient.setQueryData<LeaveRequest[]>(
					["pause", "leave-requests"],
					previousRequests.map((req) =>
						req.id === id ? { ...req, status: "rejected" as const } : req,
					),
				);
			}
			return { previousRequests };
		},
		onError: (
			_err: Error,
			_vars: { id: string; version: number },
			context: unknown,
		) => {
			const ctx = context as OptimisticContext | undefined;
			if (ctx?.previousRequests) {
				queryClient.setQueryData(
					["pause", "leave-requests"],
					ctx.previousRequests,
				);
			}
			toast.error(t`Failed to reject leave.`);
		},
		onSuccess: () => {
			toast.success(t`Leave rejected.`);
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: ["pause", "leave-requests"] });
		},
	});

	const cancelMutation = useCancelLeaveRequest({
		onSuccess: () => {
			toast.success(t`Leave request cancelled.`);
		},
		onError: () => toast.error(t`Failed to cancel leave.`),
	});

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
						? "bg-green-500/20 text-green-500"
						: status === "rejected"
							? "bg-red-500/20 text-red-500"
							: "bg-amber-500/20 text-amber-500";
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
						<Button
							size="sm"
							onClick={() =>
								approveMutation.mutate({ id: req.id, version: req.version })
							}
							disabled={approveMutation.isPending}
						>
							<Check className="h-4 w-4" />
						</Button>
						<HoldToConfirm
							onConfirm={() =>
								rejectMutation.mutate({ id: req.id, version: req.version })
							}
							disabled={rejectMutation.isPending}
							className="bg-red-600 text-white hover:bg-red-500"
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
			<DataTable columns={columns} data={requests || []} />
		</div>
	);
}
