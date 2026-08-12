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
          { accessorKey: 'event_type', header: 'Event' },
          { accessorKey: 'created_at', header: 'Time' },
          {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => (
              <Badge variant="outline">
                {row.original.event_type === 'opened' ? 'Opened' : 'Clicked'}
              </Badge>
            ),
          },
        ]}
        data={events}
      />
    </div>
  );
}
