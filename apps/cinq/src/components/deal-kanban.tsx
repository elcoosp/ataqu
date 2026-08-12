import { useQuery, useQueryClient } from '@tanstack/react-query';
import { KanbanBoard, Badge, Skeleton } from '@ataqu/ui';
import { toast } from 'sonner';
import { Trans } from '@lingui/react/macro';
import {
  useListDeals,
  useListPipelineStages,
  useUpdateDeal,
} from '@ataqu/api-client';
import { useNavigate } from '@tanstack/react-router';

export function DealKanban() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: stages, isLoading: stagesLoading } = useListPipelineStages();
  const { data: deals, isLoading: dealsLoading } = useListDeals({ limit: 1000 });
  const updateDeal = useUpdateDeal();

  if (stagesLoading || dealsLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  const columns = (stages || []).map((stage) => ({
    id: stage.id,
    title: stage.name,
    items: (deals || []).filter((d) => d.pipeline_stage_id === stage.id),
  }));

  const handleDragEnd = (newColumns: any[]) => {
    // Simple: just refetch and show a toast
    queryClient.invalidateQueries({ queryKey: ['cinq', 'deals'] });
    toast.info('Deal moved');
  };

  const renderItem = (deal: any) => (
    <div
      className="p-3 bg-deep-night/50 border border-gray-700/40 rounded-lg cursor-pointer hover:border-amber/50 transition-colors"
      onClick={() => navigate({ to: `/deals/${deal.id}` })}
      data-tour="deal-card"
    >
      <div className="font-medium">{deal.title}</div>
      <div className="text-sm text-muted-foreground">${deal.amount.toLocaleString()}</div>
      {deal.probability !== null && deal.probability !== undefined && (
        <div className="text-xs">Prob: {deal.probability}%</div>
      )}
      <div className="mt-1">
        <Badge variant="outline">{deal.status}</Badge>
      </div>
    </div>
  );

  return (
    <div data-tour="kanban-board">
      <KanbanBoard
        columns={columns}
        onDragEnd={handleDragEnd}
        renderItem={renderItem}
      />
    </div>
  );
}
