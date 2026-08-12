import { Trans } from '@lingui/react/macro';
import { History } from 'lucide-react';
import { EmptyState } from './empty-state';
import type { WorkflowRun } from '@ataqu/api-client';

interface ExecutionHistoryProps {
  runs: WorkflowRun[];
}

const STATUS_COLORS: Record<string, string> = {
  completed: 'text-green-500',
  failed: 'text-red-500',
  running: 'text-blue-500',
  pending_approval: 'text-amber-500',
};

export function ExecutionHistory({ runs }: ExecutionHistoryProps) {
  if (runs.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="No runs yet"
        description="Test your workflow to see execution history."
        ctaLabel="Test Workflow"
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm text-left">
        <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
          <tr>
            <th className="px-4 py-3"><Trans>Workflow</Trans></th>
            <th className="px-4 py-3"><Trans>Status</Trans></th>
            <th className="px-4 py-3"><Trans>Started</Trans></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {runs.map((run) => (
            <tr key={run.id} className="bg-card hover:bg-accent/50 transition-colors">
              <td className="px-4 py-3 font-mono text-xs">{run.workflow_id.slice(0, 8)}</td>
              <td className={`px-4 py-3 font-medium ${STATUS_COLORS[run.status] || 'text-foreground'}`}>{run.status}</td>
              <td className="px-4 py-3 text-muted-foreground">{new Date(run.created_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
