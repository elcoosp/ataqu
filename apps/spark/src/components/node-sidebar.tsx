import { Trans } from '@lingui/react/macro';

const TRIGGERS = [
  { id: 'event', label: 'Outbox Event', eventTypes: ['cinq.deal.won', 'sond.form.submitted', 'vault.stock.below_threshold', 'pause.leave.requested', 'tempo.meeting.no_show'] },
  { id: 'schedule', label: 'Schedule', eventTypes: [] },
  { id: 'webhook', label: 'Webhook', eventTypes: [] },
];

const ACTIONS = [
  { id: 'create_dial_channel', label: 'Create DIAL Channel' },
  { id: 'send_dial_message', label: 'Send DIAL Message' },
  { id: 'reserve_vault_stock', label: 'Reserve VAULT Stock' },
  { id: 'create_cinq_activity', label: 'Create CINQ Activity' },
  { id: 'pause_leave_block', label: 'Block PAUSE Leave' },
  { id: 'pivot_task_create', label: 'Create PIVOT Task' },
];

const CONDITIONS = [
  { id: 'field_equals', label: 'Field ==' },
  { id: 'field_greater_than', label: 'Field >' },
  { id: 'field_less_than', label: 'Field <' },
  { id: 'field_contains', label: 'Field contains' },
];

export function NodeSidebar() {
  const onDragStart = (event: React.DragEvent, nodeType: string, nodeId: string) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify({ nodeType, nodeId }));
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="w-56 border-r border-border bg-card overflow-y-auto p-3 flex-shrink-0" data-tour="trigger-sidebar">
      <h2 className="text-sm font-heading font-bold text-foreground mb-3"><Trans>Nodes</Trans></h2>

      <div className="mb-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2"><Trans>Triggers</Trans></h3>
        {TRIGGERS.map((t) => (
          <div
            key={t.id}
            className="p-2 mb-1 rounded-md border border-l-4 border-l-green-500 border-border bg-background text-sm cursor-grab active:cursor-grabbing hover:bg-accent"
            draggable
            onDragStart={(e) => onDragStart(e, 'trigger', t.id)}
          >
            {t.label}
          </div>
        ))}
      </div>

      <div className="mb-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2"><Trans>Actions</Trans></h3>
        {ACTIONS.map((a) => (
          <div
            key={a.id}
            className="p-2 mb-1 rounded-md border border-l-4 border-l-blue-500 border-border bg-background text-sm cursor-grab active:cursor-grabbing hover:bg-accent"
            draggable
            onDragStart={(e) => onDragStart(e, 'action', a.id)}
          >
            {a.label}
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2"><Trans>Conditions</Trans></h3>
        {CONDITIONS.map((c) => (
          <div
            key={c.id}
            className="p-2 mb-1 rounded-md border border-l-4 border-l-amber-500 border-border bg-background text-sm cursor-grab active:cursor-grabbing hover:bg-accent"
            draggable
            onDragStart={(e) => onDragStart(e, 'condition', c.id)}
          >
            {c.label}
          </div>
        ))}
      </div>
    </aside>
  );
}
