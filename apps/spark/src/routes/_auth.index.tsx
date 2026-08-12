import { createFileRoute, Link } from '@tanstack/react-router';
import { Trans } from '@lingui/react/macro';
import { Plus } from 'lucide-react';
import { Button, Skeleton } from '@ataqu/ui';
import { useListWorkflows } from '../api/spark-api';
import { WorkflowList } from '../components/workflow-list';

export const Route = createFileRoute('/_auth/')({
  component: SparkIndex,
});

function SparkIndex() {
  const { data, isLoading } = useListWorkflows({ limit: 100, offset: 0 });

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">
            <Trans>Workflows</Trans>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            <Trans>Native automation triggers and actions. Zero per-task fees.</Trans>
          </p>
        </div>
        <Link to="/workflows/$id" params={{ id: 'new' }}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            <Trans>Create Workflow</Trans>
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <WorkflowList workflows={data?.items ?? []} />
      )}
    </div>
  );
}
