import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Skeleton, Badge } from '@ataqu/ui';
import { Trans } from '@lingui/react/macro';
import { useGetContactTracking } from '@ataqu/api-client';
import type { UUID } from '@ataqu/types';

export function EmailTrackingTab({ contactId }: { contactId: UUID }) {
  const { data, isLoading } = useGetContactTracking(contactId, { limit: 50 });

  if (isLoading) return <Skeleton className="h-32 w-full" />;

  const events = data?.items || [];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-gray-700">
          <tr>
            <th className="text-left py-2 px-3">Event</th>
            <th className="text-left py-2 px-3">Time</th>
            <th className="text-left py-2 px-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => (
            <tr key={e.id} className="border-b border-gray-700/50">
              <td className="py-2 px-3">{e.event_type}</td>
              <td className="py-2 px-3">{format(new Date(e.created_at), 'PPp')}</td>
              <td className="py-2 px-3">
                <Badge variant="outline">
                  {e.event_type === 'opened' ? 'Opened' : 'Clicked'}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
