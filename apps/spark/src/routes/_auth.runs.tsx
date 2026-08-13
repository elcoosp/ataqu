import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Trans } from '@lingui/react/macro';
import { useListWorkflowRuns } from '../api/spark-api';
import { ExecutionHistory } from '../components/execution-history';
import { RunDetailPanel } from '../components/run-detail-panel';
import type { WorkflowRun } from '@ataqu/api-client';

export const Route = createFileRoute('/_auth/runs')({
  component: RunsPage,
});

function RunsPage() {
  const { data, isLoading } = useListWorkflowRuns({ limit: 50, offset: 0 });
  const [selectedRun, setSelectedRun] = useState<WorkflowRun | null>(null);

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">
          <Trans>Execution History</Trans>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          <Trans>Monitor all workflow runs across your workspace.</Trans>
        </p>
      </div>

      <ExecutionHistory
        runs={data?.items ?? []}
        isLoading={isLoading}
        onSelectRun={setSelectedRun}
      />

      {selectedRun && (
        <RunDetailPanel
          run={selectedRun}
          onClose={() => setSelectedRun(null)}
        />
      )}
    </div>
  );
}
