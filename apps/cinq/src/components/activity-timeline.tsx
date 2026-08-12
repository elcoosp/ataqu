import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Card, CardContent, Skeleton } from '@ataqu/ui';
import { Trans } from '@lingui/react/macro';
import { useListActivities } from '@ataqu/api-client';
import type { UUID } from '@ataqu/types';

export function ActivityTimeline({ dealId }: { dealId: UUID }) {
  const { data, isLoading } = useListActivities({ deal_id: dealId, limit: 50 });

  if (isLoading) {
    return <Skeleton className="h-32 w-full" />;
  }

  const activities = data || [];

  return (
    <div className="space-y-4">
      {activities.length === 0 ? (
        <p className="text-muted-foreground"><Trans>No activities yet</Trans></p>
      ) : (
        activities.map((a) => (
          <Card key={a.id}>
            <CardContent className="p-4">
              <div className="flex justify-between">
                <span className="font-medium capitalize">{a.activity_type}</span>
                <span className="text-sm text-muted-foreground">
                  {format(new Date(a.created_at), 'PPp')}
                </span>
              </div>
              <p className="mt-1">{a.description}</p>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
