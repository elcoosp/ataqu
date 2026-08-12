import {
  type LeaveRequest,
  useApproveLeaveRequest,
  useListLeaveRequests,
  useRejectLeaveRequest,
} from '@ataqu/api-client';
import { Badge, Button, DataTable } from '@ataqu/ui';
import type { ColumnDef } from '@tanstack/react-table';
import { Check, X } from 'lucide-react';
import { toast } from 'sonner';

export function ApprovalDashboard() {
  const { data: requests, isLoading } = useListLeaveRequests();

  const approveMutation = useApproveLeaveRequest({
    onSuccess: () => toast.success('Leave approved.'),
    onError: () => toast.error('Failed to approve leave.'),
  });

  const rejectMutation = useRejectLeaveRequest({
    onSuccess: () => toast.success('Leave rejected.'),
    onError: () => toast.error('Failed to reject leave.'),
  });

  const columns: ColumnDef<LeaveRequest>[] = [
    {
      accessorKey: 'employee_name',
      header: 'Employee',
    },
    {
      accessorKey: 'start_date',
      header: 'Start Date',
    },
    {
      accessorKey: 'end_date',
      header: 'End Date',
    },
    {
      accessorKey: 'leave_type',
      header: 'Type',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status;
        const color =
          status === 'approved'
            ? 'bg-green-500/20 text-green-500'
            : status === 'rejected'
              ? 'bg-red-500/20 text-red-500'
              : 'bg-amber-500/20 text-amber-500';
        return <Badge className={color}>{status}</Badge>;
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const req = row.original;
        return req.status === 'pending' ? (
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => approveMutation.mutate(req.id)}
              disabled={approveMutation.isPending}
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => rejectMutation.mutate(req.id)}
              disabled={rejectMutation.isPending}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : null;
      },
    },
  ];

  if (isLoading) return <div>Loading...</div>;

  return (
    <div data-tour="pending-list">
      <DataTable columns={columns} data={requests || []} />
    </div>
  );
}
