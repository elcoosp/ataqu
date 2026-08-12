import { createFileRoute } from '@tanstack/react-router';
import { Trans } from '@lingui/react/macro';
import { Skeleton } from '@ataqu/ui';
import { useListWorkflowRuns } from '../api/hooks';
import { ExecutionHistory } from '../components/execution-history';

export const Route = createFileRoute('/_auth/runs')({
  component: RunsPage,
});

function RunsPage() {
  const { data, isLoading } = useListWorkflowRuns();

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-heading font-bold text-foreground"><Trans>Execution History</Trans></h1>
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : (
        <ExecutionHistory runs={data?.items ?? []} />
      )}
    </div>
  );
}
