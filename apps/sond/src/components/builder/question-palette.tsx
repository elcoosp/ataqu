import { useDraggable } from '@dnd-kit/core';
import { Type, Mail, CheckSquare, List, Calendar, Star, Phone } from 'lucide-react';
import { Trans, t } from '@lingui/macro';
import type { FormQuestion } from '@ataqu/api-client';

const questionTypes: { type: FormQuestion['type']; labelKey: string; icon: typeof Type }[] = [
  { type: 'text', labelKey: 'Text', icon: Type },
  { type: 'email', labelKey: 'Email', icon: Mail },
  { type: 'choice', labelKey: 'Choice', icon: CheckSquare },
  { type: 'multiple_choice', labelKey: 'Multiple Choice', icon: List },
  { type: 'date', labelKey: 'Date', icon: Calendar },
  { type: 'rating', labelKey: 'Rating', icon: Star },
  { type: 'phone', labelKey: 'Phone', icon: Phone },
];

function DraggableItem({ type, label, icon: Icon }: { type: FormQuestion['type']; label: string; icon: typeof Type }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `palette-${type}`,
    data: { type },
  });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      className="flex w-full items-center gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:bg-accent"
    >
      <Icon className="h-5 w-5 text-muted-foreground" />
      <span className="font-medium">{label}</span>
    </button>
  );
}

export function QuestionPalette() {
  return (
    <div className="w-64 overflow-y-auto border-r border-border bg-background p-4">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        <Trans>Question Types</Trans>
      </h3>
      <div className="space-y-2">
        {questionTypes.map((q) => (
          <DraggableItem key={q.type} type={q.type} label={t`${q.labelKey}`} icon={q.icon} />
        ))}
      </div>
    </div>
  );
}
