import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@ataqu/ui';
import type { DealResponse } from '@ataqu/api-client';
import { useNavigate } from '@tanstack/react-router';

export function DealCard({ deal }: { deal: DealResponse }) {
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: deal.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card
        className="cursor-grab hover:shadow-md transition-shadow"
        onClick={() => navigate({ to: `/deals/${deal.id}` })}
        data-tour="deal-card"
      >
        <CardContent className="p-3">
          <div className="font-medium">{deal.title}</div>
          <div className="text-sm text-muted-foreground">${deal.amount.toLocaleString()}</div>
          {deal.probability !== null && deal.probability !== undefined && (
            <div className="text-xs">Prob: {deal.probability}%</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
