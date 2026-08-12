import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  useSensors,
  useSensor,
  MouseSensor,
  TouchSensor,
  closestCorners,
} from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { useToast } from '@ataqu/ui';
import { Trans } from '@lingui/react/macro';
import {
  useListDeals,
  useListPipelineStages,
  useUpdateDeal,
} from '@ataqu/api-client';
import { DealCard } from './deal-card';
import { EmptyState } from '@ataqu/ui';
import { TrendingUp } from 'lucide-react';

export function DealKanban() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: stages } = useListPipelineStages();
  const { data: dealsData } = useListDeals({ limit: 1000 });
  const deals = dealsData?.items || [];

  const updateDeal = useUpdateDeal();

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over) return;
    const dealId = active.id;
    const newStageId = over.id;

    // Optimistic update
    queryClient.setQueryData(['cinq', 'deals', { limit: 1000 }], (old: any) => {
      if (!old) return old;
      const updatedItems = old.items.map((d: any) =>
        d.id === dealId ? { ...d, pipeline_stage_id: newStageId } : d
      );
      return { ...old, items: updatedItems };
    });

    updateDeal.mutate(
      { id: dealId, data: { pipeline_stage_id: newStageId } },
      {
        onError: () => {
          toast({ title: <Trans>Failed to move deal</Trans>, variant: 'destructive' });
          queryClient.invalidateQueries({ queryKey: ['cinq', 'deals'] });
        },
        onSuccess: () => {
          toast({ title: <Trans>Deal moved</Trans> });
        },
      }
    );
  };

  if (!stages || stages.length === 0) {
    return (
      <EmptyState
        icon={TrendingUp}
        title={<Trans>No pipeline stages</Trans>}
        description={<Trans>Create a pipeline stage to start tracking deals.</Trans>}
      />
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto p-4" data-tour="kanban-board">
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        {stages.map((stage) => {
          const stageDeals = deals.filter((d) => d.pipeline_stage_id === stage.id);
          return (
            <div key={stage.id} className="min-w-[280px] flex-1 bg-muted/20 rounded-lg p-2">
              <h3 className="font-semibold mb-2">{stage.name}</h3>
              <div className="space-y-2">
                <SortableContext
                  items={stageDeals.map((d) => d.id)}
                  strategy={horizontalListSortingStrategy}
                >
                  {stageDeals.map((deal) => (
                    <DealCard key={deal.id} deal={deal} />
                  ))}
                </SortableContext>
              </div>
            </div>
          );
        })}
      </DndContext>
    </div>
  );
}
