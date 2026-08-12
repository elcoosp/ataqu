import { Trans } from '@lingui/react/macro';
import { Link } from '@tanstack/react-router';
import { Zap } from 'lucide-react';
import { Button } from '@ataqu/ui';
import { EmptyState } from './empty-state';
import type { Workflow } from '@ataqu/api-client';
import { useToggleWorkflow } from '../api/hooks';

interface WorkflowListProps {
  workflows: Workflow[];
}

export function WorkflowList({ workflows }: WorkflowListProps) {
  const toggleMutation = useToggleWorkflow();

  if (workflows.length === 0) {
    return (
      <EmptyState
        icon={Zap}
        title="No workflows"
        description="Zapier would charge you $30/mo for this. Turn on your first native trigger."
        ctaLabel="Create Workflow"
      />
    );
  }

  return (
    <div className="space-y-3">
      {workflows.map((wf) => (
        <div key={wf.id} className="flex items-center justify-between p-4 bg-card border border-border rounded-lg">
          <div>
            <Link to="/workflows/$id" params={{ id: wf.id }} className="text-foreground font-medium hover:text-primary">
              {wf.name}
            </Link>
            <p className="text-xs text-muted-foreground mt-1">
              {wf.trigger.type} &middot; {wf.is_active ? <Trans>Active</Trans> : <Trans>Inactive</Trans>}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={wf.is_active}
            className={`relative h-6 w-11 rounded-full transition-colors ${wf.is_active ? 'bg-primary' : 'bg-muted'}`}
            onClick={() => toggleMutation.mutate({ id: wf.id, is_active: !wf.is_active, version: wf.version })}
          >
            <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${wf.is_active ? 'translate-x-5' : ''}`} />
          </button>
        </div>
      ))}
    </div>
  );
}
