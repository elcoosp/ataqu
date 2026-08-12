import {
  Badge,
  Button,
  cn,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ataqu/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { formatDistanceToNow } from 'date-fns';
import { listTickets, updateTicketStatus } from '@/api/tickets';

export function TicketList() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['tickets'],
    queryFn: () => listTickets({ limit: 100, offset: 0 }),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateTicketStatus(id, status as Ticket['status']),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });

  if (isLoading) {
    return <Skeleton className="h-20 w-full" />;
  }

  if (!data?.items.length) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No support tickets yet.
      </div>
    );
  }

  const statusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-yellow-500/20 text-yellow-500';
      case 'pending':
        return 'bg-blue-500/20 text-blue-500';
      case 'closed':
        return 'bg-green-500/20 text-green-500';
      default:
        return '';
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Subject</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Last Message</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.items.map((ticket) => (
          <TableRow key={ticket.id}>
            <TableCell>
              <Link to="/tickets/$id" params={{ id: ticket.id }} className="hover:underline">
                {ticket.subject}
              </Link>
            </TableCell>
            <TableCell>
              <Badge className={cn('capitalize', statusColor(ticket.status))}>
                {ticket.status}
              </Badge>
            </TableCell>
            <TableCell className="capitalize">{ticket.priority}</TableCell>
            <TableCell>{ticket.customer_email}</TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {formatDistanceToNow(new Date(ticket.last_message_at), { addSuffix: true })}
            </TableCell>
            <TableCell>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const newStatus = ticket.status === 'closed' ? 'open' : 'closed';
                  updateStatus.mutate({ id: ticket.id, status: newStatus });
                }}
              >
                {ticket.status === 'closed' ? 'Reopen' : 'Close'}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
