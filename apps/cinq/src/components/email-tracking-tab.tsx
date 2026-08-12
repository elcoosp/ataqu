import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Table, Skeleton, Badge } from '@ataqu/ui';
import { Trans } from '@lingui/react/macro';
import { useGetContactTracking } from '@ataqu/api-client';
import type { UUID } from '@ataqu/types';

export function EmailTrackingTab({ contactId }: { contactId: UUID }) {
  const { data, isLoading } = useGetContactTracking(contactId, { limit: 50 });

  if (isLoading) return <Skeleton className="h-32 w-full" />;

  const events = data?.items || [];

  return (
    <div>
      <Table
        columns={[
          { accessorKey: 'eventType', header: <Trans>Event</Trans> },
          { accessorKey: 'created_at', header: <Trans>Time</Trans> },
          {
            accessorKey: 'status',
            header: <Trans>Status</Trans>,
            cell: ({ row }) => (
              <Badge variant={row.original.event_type === 'opened' ? 'success' : 'default'}>
                {row.original.event_type === 'opened' ? <Trans>Opened</Trans> : <Trans>Clicked</Trans>}
              </Badge>
            ),
          },
        ]}
        data={events}
      />
    </div>
  );
}
