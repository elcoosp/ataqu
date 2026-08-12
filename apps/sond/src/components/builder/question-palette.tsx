import { useDraggable } from '@dnd-kit/core';
import { Type, Mail, CheckSquare, List, Calendar, Star, Phone } from 'lucide-react';
import type { FormQuestion } from '@ataqu/api-client';

const questionTypes: { type: FormQuestion['type']; label: string; icon: typeof Type }[] = [
  { type: 'text', label: 'Text', icon: Type },
  { type: 'email', label: 'Email', icon: Mail },
  { type: 'choice', label: 'Choice', icon: CheckSquare },
  { type: 'multiple_choice', label: 'Multiple Choice', icon: List },
  { type: 'date', label: 'Date', icon: Calendar },
  { type: 'rating', label: 'Rating', icon: Star },
  { type: 'phone', label: 'Phone', icon: Phone },
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
        Question Types
      </h3>
      <div className="space-y-2">
        {questionTypes.map((q) => (
          <DraggableItem key={q.type} {...q} />
        ))}
      </div>
    </div>
  );
}
