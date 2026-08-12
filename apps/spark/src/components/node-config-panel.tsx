import { Trans } from '@lingui/react/macro';
import type { Node } from '@xyflow/react';
import { Button } from '@ataqu/ui';
import { X } from 'lucide-react';

interface NodeConfigPanelProps {
  node: Node | null;
  onClose: () => void;
}

export function NodeConfigPanel({ node, onClose }: NodeConfigPanelProps) {
  if (!node) return null;
  const nodeType = (node.data as Record<string, unknown>)?.nodeType as string;

  return (
    <aside className="w-72 border-l border-border bg-card p-4 overflow-y-auto flex-shrink-0">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-heading font-bold text-foreground capitalize">
          {nodeType === 'trigger' && <Trans>Trigger Config</Trans>}
          {nodeType === 'action' && <Trans>Action Config</Trans>}
          {nodeType === 'condition' && <Trans>Condition Config</Trans>}
        </h2>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {nodeType === 'trigger' && (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1"><Trans>Event Type</Trans></label>
            <select className="w-full p-2 rounded-md border border-border bg-background text-foreground text-sm">
              <option value="cinq.deal.won">cinq.deal.won</option>
              <option value="sond.form.submitted">sond.form.submitted</option>
              <option value="vault.stock.below_threshold">vault.stock.below_threshold</option>
              <option value="pause.leave.requested">pause.leave.requested</option>
              <option value="tempo.meeting.no_show">tempo.meeting.no_show</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1"><Trans>Filter (optional)</Trans></label>
            <input className="w-full p-2 rounded-md border border-border bg-background text-foreground text-sm" placeholder='{"amount": {"$gt": 1000}}' />
          </div>
        </div>
      )}

      {nodeType === 'action' && (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1"><Trans>Action</Trans></label>
            <select className="w-full p-2 rounded-md border border-border bg-background text-foreground text-sm">
              <option value="create_dial_channel">Create DIAL Channel</option>
              <option value="send_dial_message">Send DIAL Message</option>
              <option value="reserve_vault_stock">Reserve VAULT Stock</option>
              <option value="create_cinq_activity">Create CINQ Activity</option>
              <option value="pause_leave_block">Block PAUSE Leave</option>
              <option value="pivot_task_create">Create PIVOT Task</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1"><Trans>Parameters (JSON)</Trans></label>
            <textarea className="w-full p-2 rounded-md border border-border bg-background text-foreground text-sm font-mono h-24" defaultValue="{}" />
          </div>
        </div>
      )}

      {nodeType === 'condition' && (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1"><Trans>Field</Trans></label>
            <input className="w-full p-2 rounded-md border border-border bg-background text-foreground text-sm" placeholder="payload.amount" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1"><Trans>Operator</Trans></label>
            <select className="w-full p-2 rounded-md border border-border bg-background text-foreground text-sm">
              <option value="==">==</option>
              <option value=">">&gt;</option>
              <option value="<">&lt;</option>
              <option value="contains">contains</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1"><Trans>Value</Trans></label>
            <input className="w-full p-2 rounded-md border border-border bg-background text-foreground text-sm" placeholder="1000" />
          </div>
        </div>
      )}
    </aside>
  );
}
