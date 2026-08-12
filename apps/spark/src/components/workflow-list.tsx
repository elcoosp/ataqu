import { Trans } from '@lingui/react/macro';
import { Link } from '@tanstack/react-router';
import { Switch } from '@ataqu/ui';
import { Zap, Play, Copy, Trash2 } from 'lucide-react';
import { Button } from '@ataqu/ui';
import type { Workflow } from '@ataqu/api-client';
import { useToggleWorkflow, useDeleteWorkflow } from '../api/spark-api';
import { EmptyState } from './empty-state';
import { toast } from 'sonner';

interface WorkflowListProps {
  workflows: Workflow[];
}

const TRIGGER_LABELS: Record<string, string> = {
  webhook: 'Webhook',
  schedule: 'Schedule',
  event: 'Outbox Event',
};

export function WorkflowList({ workflows }: WorkflowListProps) {
  const toggleMutation = useToggleWorkflow();
  const deleteMutation = useDeleteWorkflow();

  if (workflows.length === 0) {
    return (
      <EmptyState
        icon={Zap}
        title={<Trans>No workflows</Trans>}
        description={<Trans>Zapier would charge you $30/mo for this. Turn on your first native trigger.</Trans>}
      />
    );
  }

  return (
    <div className="space-y-3">
      {workflows.map((wf) => (
        <div
          key={wf.id}
          className="flex items-center justify-between p-4 bg-card border border-border rounded-lg hover:bg-accent/30 transition-colors"
        >
          <div className="flex-1 min-w-0">
            <Link
              to="/workflows/$id"
              params={{ id: wf.id }}
              className="text-foreground font-medium hover:text-primary transition-colors block truncate"
            >
              {wf.name}
            </Link>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Zap className="h-3 w-3" />
                {TRIGGER_LABELS[wf.trigger.type] || wf.trigger.type}
              </span>
              <span>•</span>
              <span>
                <Trans>Last updated:</Trans>{' '}
                {new Date(wf.updated_at).toLocaleDateString()}
              </span>
              {wf.webhook_secret && (
                <>
                  <span>•</span>
                  <span className="text-amber"><Trans>Secured</Trans></span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 ml-4">
            <Link to="/workflows/$id" params={{ id: wf.id }}>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Edit workflow">
                <Play className="h-4 w-4" />
              </Button>
            </Link>
            <span className="text-xs text-muted-foreground w-16 text-right">
              {wf.is_active ? <Trans>Active</Trans> : <Trans>Inactive</Trans>}
            </span>
            <Switch
              checked={wf.is_active}
              onCheckedChange={(checked) =>
                toggleMutation.mutate(
                  { id: wf.id, is_active: checked, version: wf.version },
                  {
                    onSuccess: () => {
                      toast.success(
                        checked
                          ? 'Workflow enabled.'
                          : 'Workflow disabled.'
                      );
                    },
                    onError: () => {
                      toast.error('Failed to toggle workflow.');
                    },
                  }
                )
              }
              aria-label={wf.is_active ? 'Disable workflow' : 'Enable workflow'}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
