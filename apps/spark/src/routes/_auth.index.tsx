import { createFileRoute, Link } from '@tanstack/react-router';
import { Trans } from '@lingui/react/macro';
import { Plus } from 'lucide-react';
import { Button, Skeleton } from '@ataqu/ui';
import { useListWorkflows } from '../api/hooks';
import { WorkflowList } from '../components/workflow-list';

export const Route = createFileRoute('/_auth/')({
  component: SparkIndex,
});

function SparkIndex() {
  const { data, isLoading } = useListWorkflows();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-heading font-bold text-foreground"><Trans>Workflows</Trans></h1>
        <Link to="/workflows/$id" params={{ id: 'new' }}>
          <Button><Plus className="mr-2 h-4 w-4" /><Trans>Create Workflow</Trans></Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : (
        <WorkflowList workflows={data?.items ?? []} />
      )}
    </div>
  );
}
