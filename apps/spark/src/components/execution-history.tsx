import { Trans } from '@lingui/react/macro';
import { History, ChevronRight } from 'lucide-react';
import { Button, Skeleton } from '@ataqu/ui';
import type { WorkflowRun } from '@ataqu/api-client';
import { useApproveWorkflowRun } from '../api/spark-api';
import { EmptyState } from './empty-state';
import { toast } from 'sonner';

interface ExecutionHistoryProps {
  runs: WorkflowRun[];
  isLoading: boolean;
  onSelectRun?: (run: WorkflowRun) => void;
}

const STATUS_STYLES: Record<string, string> = {
  completed: 'bg-green-500/20 text-green-400 border-green-500/30',
  failed: 'bg-red-500/20 text-red-400 border-red-500/30',
  running: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  pending_approval: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  approved: 'bg-green-500/20 text-green-400 border-green-500/30',
  rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const STATUS_LABELS: Record<string, React.ReactNode> = {
  completed: <Trans>Completed</Trans>,
  failed: <Trans>Failed</Trans>,
  running: <Trans>Running</Trans>,
  pending_approval: <Trans>Pending Approval</Trans>,
  approved: <Trans>Approved</Trans>,
  rejected: <Trans>Rejected</Trans>,
};

export function ExecutionHistory({ runs, isLoading, onSelectRun }: ExecutionHistoryProps) {
  const approveMutation = useApproveWorkflowRun();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <EmptyState
        icon={History}
        title={<Trans>No runs yet</Trans>}
        description={<Trans>Test your workflow to see execution history.</Trans>}
      />
    );
  }

  return (
    <div className="space-y-2">
      {runs.map((run) => (
        <div
          key={run.id}
          className="flex items-center justify-between p-4 bg-card border border-border rounded-lg hover:bg-accent/30 transition-colors cursor-pointer"
          onClick={() => onSelectRun?.(run)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') onSelectRun?.(run); }}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[run.status] || ''}`}>
                {STATUS_LABELS[run.status] || run.status}
              </span>
              <span className="text-xs font-mono text-muted-foreground truncate">
                {run.id.slice(0, 8)}
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              <Trans>Started:</Trans>{' '}
              {new Date(run.created_at).toLocaleString()}
            </div>
          </div>

          <div className="flex items-center gap-2 ml-4">
            {run.status === 'pending_approval' && (
              <Button
                size="sm"
                variant="outline"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  approveMutation.mutate(run.id, {
                    onSuccess: () => toast.success('Run approved.'),
                    onError: () => toast.error('Failed to approve run.'),
                  });
                }}
              >
                <Trans>Approve</Trans>
              </Button>
            )}
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      ))}
    </div>
  );
}
