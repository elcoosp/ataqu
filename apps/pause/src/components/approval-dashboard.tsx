import {
  type LeaveRequest,
  useApproveLeaveRequest,
  useListLeaveRequests,
  useRejectLeaveRequest,
} from '@ataqu/api-client';
import { Badge, Button, DataTable } from '@ataqu/ui';
import { useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface OptimisticContext {
  previousRequests?: LeaveRequest[];
}

export function ApprovalDashboard() {
  const queryClient = useQueryClient();
  const { data: requests, isLoading } = useListLeaveRequests();

  const approveMutation = useApproveLeaveRequest({
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['pause', 'leave-requests'] });
      const previousRequests = queryClient.getQueryData<LeaveRequest[]>([
        'pause',
        'leave-requests',
      ]);
      if (previousRequests) {
        queryClient.setQueryData<LeaveRequest[]>(
          ['pause', 'leave-requests'],
          previousRequests.map((req) =>
            req.id === id ? { ...req, status: 'approved' as const } : req
          )
        );
      }
      return { previousRequests };
    },
    onError: (_err: Error, _id: string, context: unknown) => {
      const ctx = context as OptimisticContext | undefined;
      if (ctx?.previousRequests) {
        queryClient.setQueryData(['pause', 'leave-requests'], ctx.previousRequests);
      }
      toast.error('Failed to approve leave.');
    },
    onSuccess: () => {
      toast.success('Leave approved.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['pause', 'leave-requests'] });
    },
  });

  const rejectMutation = useRejectLeaveRequest({
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['pause', 'leave-requests'] });
      const previousRequests = queryClient.getQueryData<LeaveRequest[]>([
        'pause',
        'leave-requests',
      ]);
      if (previousRequests) {
        queryClient.setQueryData<LeaveRequest[]>(
          ['pause', 'leave-requests'],
          previousRequests.map((req) =>
            req.id === id ? { ...req, status: 'rejected' as const } : req
          )
        );
      }
      return { previousRequests };
    },
    onError: (_err: Error, _id: string, context: unknown) => {
      const ctx = context as OptimisticContext | undefined;
      if (ctx?.previousRequests) {
        queryClient.setQueryData(['pause', 'leave-requests'], ctx.previousRequests);
      }
      toast.error('Failed to reject leave.');
    },
    onSuccess: () => {
      toast.success('Leave rejected.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['pause', 'leave-requests'] });
    },
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
