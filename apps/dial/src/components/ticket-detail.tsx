import { useIdempotency } from '@ataqu/shared-hooks';
import { Badge, Button, cn, Skeleton } from '@ataqu/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';
import { getTicket, listTicketMessages, replyToTicket, updateTicketStatus } from '@/api/tickets';

export function TicketDetail() {
  const { id } = useParams({ from: '/_auth/tickets/$id' });
  const queryClient = useQueryClient();
  const [reply, setReply] = useState('');
  const { resetKey } = useIdempotency();

  const { data: ticket, isLoading: ticketLoading } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => getTicket(id),
  });

  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ['ticket-messages', id],
    queryFn: () => listTicketMessages(id, { limit: 100, offset: 0 }),
  });

  const replyMutation = useMutation({
    mutationFn: (content: string) => replyToTicket(id, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-messages', id] });
      setReply('');
      resetKey();
    },
  });

  const updateStatus = useMutation({
    mutationFn: (status: string) => updateTicketStatus(id, status as Ticket['status']),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
    },
  });

  if (ticketLoading || messagesLoading) {
    return <Skeleton className="h-40 w-full" />;
  }

  if (!ticket) return <div>Ticket not found</div>;

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">{ticket.subject}</h1>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{ticket.status}</Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateStatus.mutate(ticket.status === 'closed' ? 'open' : 'closed')}
            >
              {ticket.status === 'closed' ? 'Reopen' : 'Close'}
            </Button>
          </div>
        </div>
        <div className="text-sm text-muted-foreground mt-1">
          Customer: {ticket.customer_email} · Priority: {ticket.priority}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages?.map((msg) => (
          <div
            key={msg.id}
            className={cn('flex', msg.from_customer ? 'justify-start' : 'justify-end')}
          >
            <div
              className={cn(
                'max-w-[70%] p-3 rounded-md',
                msg.from_customer ? 'bg-card' : 'bg-primary/10'
              )}
            >
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <span>{msg.from_customer ? ticket.customer_email : 'Support'}</span>
                <span>{formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}</span>
              </div>
              <div className="mt-1 whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-border p-4">
        <div className="flex gap-2">
          <textarea
            className="flex-1 min-h-[60px] resize-none bg-background border border-input rounded-md px-3 py-2 text-sm"
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Type a reply..."
            className="flex-1 min-h-[60px]"
          />
          <Button
            onClick={() => replyMutation.mutate(reply)}
            disabled={!reply.trim() || replyMutation.isPending}
          >
            Reply
          </Button>
        </div>
      </div>
    </div>
  );
}
