import {
	approveLeaveRequest,
	type LeaveRequest,
	type PaginatedResponse,
	rejectLeaveRequest,
	useCancelLeaveRequest,
	useListLeaveRequests,
} from "@ataqu/api-client";
import { useOptimisticMutation } from "@ataqu/shared-hooks";
import {
	Badge,
	Button,
	DataTable,
	HoldToConfirm,
	SkeletonSwap,
} from "@ataqu/ui";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import type { ColumnDef } from "@tanstack/react-table";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { handleApiError } from "@ataqu/shared-utils";

type LeaveCache = PaginatedResponse<LeaveRequest> | undefined;
type LeaveVars = { id: string; version: number };

/** Paint a status change onto the cached leave-request list. */
const setStatus =
	(status: LeaveRequest["status"]) =>
	(old: LeaveCache, { id }: LeaveVars): LeaveCache =>
		old
			? {
					...old,
					items: old.items.map((req: any) =>
						req.id === id ? { ...req, status } : req,
					),
				}
			: old;

export function ApprovalDashboard() {
	const queryClient = useQueryClient();
	const { data: requests, isLoading } = useListLeaveRequests();

	const approveMutation = useOptimisticMutation<void, LeaveCache, LeaveVars>({
		listQueryKey: ["pause", "leave-requests", undefined],
		mutationFn: ({ id, version }) =>
			approveLeaveRequest(id, version).then(() => undefined),
		optimisticUpdate: setStatus("approved"),
		onError: () => toast.error(t`Failed to approve leave.`),
		onSuccess: (_data, _vars, context: any) => {
			toast.success(t`Leave approved.`, {
				action: {
					label: "Undo",
					onClick: () => {
						if (context?.previous) {
							queryClient.setQueryData(
								["pause", "leave-requests", undefined],
								context.previous,
							);
							toast.dismiss();
						}
					},
				},
			});
		},
	});

	const rejectMutation = useOptimisticMutation<void, LeaveCache, LeaveVars>({
		listQueryKey: ["pause", "leave-requests", undefined],
		mutationFn: ({ id, version }) =>
			rejectLeaveRequest(id, version).then(() => undefined),
		optimisticUpdate: setStatus("rejected"),
		onError: () => toast.error(t`Failed to reject leave.`),
		onSuccess: (_data, _vars, context: any) => {
			toast.success(t`Leave rejected.`, {
				action: {
					label: "Undo",
					onClick: () => {
						if (context?.previous) {
							queryClient.setQueryData(
								["pause", "leave-requests", undefined],
								context.previous,
							);
							toast.dismiss();
						}
					},
				},
			});
		},
	});

	const cancelMutation = useCancelLeaveRequest({
		onMutate: async (vars) => {
			const pre = queryClient.getQueryData<LeaveCache>([
				"pause",
				"leave-requests",
				undefined,
			]);
			queryClient.setQueryData(
				["pause", "leave-requests", undefined],
				(old: any) =>
					old
						? {
								...old,
								items: old.items.filter((req: any) => req.id !== vars.id),
							}
						: old,
			);
			return { preSnapshot: pre };
		},
		onSuccess: (_data, _vars, context: any) => {
			const pre = context?.preSnapshot;
			toast.success(t`Leave request cancelled.`, {
				action: {
					label: "Undo",
					onClick: () => {
						if (pre) {
							queryClient.setQueryData(
								["pause", "leave-requests", undefined],
								pre,
							);
							toast.dismiss();
						}
					},
				},
			});
		},
		onError: (err, _vars, context: any) => {
			if (context?.preSnapshot) {
				queryClient.setQueryData(
					["pause", "leave-requests", undefined],
					context.preSnapshot,
				);
			}
			toast.error(handleApiError(err));
		},
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
			<SkeletonSwap ready={false} lines={6} label="Loading approvals">
				<div />
			</SkeletonSwap>
		);

	return (
		<div data-tour="pending-list">
			<DataTable columns={columns} data={leaveItems} virtualize />
		</div>
	);
}
