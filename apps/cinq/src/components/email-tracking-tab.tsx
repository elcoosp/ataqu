import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Skeleton, Badge } from '@ataqu/ui';
import { Trans } from '@lingui/react/macro';
import { useGetContactTracking } from '@ataqu/api-client';
import type { UUID } from '@ataqu/types';

interface TrackingEvent {
  id: UUID;
  event_type: string;
  created_at: string;
  // other fields not needed
}

export function EmailTrackingTab({ contactId }: { contactId: UUID }) {
  const { data, isLoading } = useGetContactTracking(contactId, { limit: 50 });

  if (isLoading) return <Skeleton className="h-32 w-full" />;

  const events = (data?.items as TrackingEvent[]) || [];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-gray-700">
          <tr>
            <th className="text-left py-2 px-3"><Trans>Event</Trans></th>
            <th className="text-left py-2 px-3"><Trans>Time</Trans></th>
            <th className="text-left py-2 px-3"><Trans>Status</Trans></th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => (
            <tr key={e.id} className="border-b border-gray-700/50">
              <td className="py-2 px-3">{e.event_type}</td>
              <td className="py-2 px-3">{format(new Date(e.created_at), 'PPp')}</td>
              <td className="py-2 px-3">
                <Badge variant="outline">
                  {e.event_type === 'opened' ? <Trans>Opened</Trans> : <Trans>Clicked</Trans>}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
