import { createFileRoute } from '@tanstack/react-router';
import { Trans } from '@lingui/react/macro';
import { Skeleton } from '@ataqu/ui';
import { useListDLQ } from '../api/hooks';
import { DLQViewer } from '../components/dlq-viewer';

export const Route = createFileRoute('/_auth/dlq')({
  component: DLQPage,
});

function DLQPage() {
  const { data, isLoading } = useListDLQ();

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-heading font-bold text-foreground"><Trans>Dead Letter Queue</Trans></h1>
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : (
        <DLQViewer entries={data?.items ?? []} />
      )}
    </div>
  );
}
