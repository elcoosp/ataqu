import type { DealResponse, PipelineStageResponse } from "@ataqu/api-client";
import { listDeals, listPipelineStages } from "@ataqu/api-client";
import { Badge, KanbanBoard, Skeleton } from "@ataqu/ui";
import { t } from "@lingui/core/macro";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

export function DealKanban() {
	const queryClient = useQueryClient();
	const navigate = useNavigate();

	const { data: stages, isLoading: stagesLoading } = useQuery({
		queryKey: ["cinq", "pipelineStages"],
		queryFn: listPipelineStages,
	});

	const { data: deals, isLoading: dealsLoading } = useQuery({
		queryKey: ["cinq", "deals", "list"],
		queryFn: () => listDeals({ limit: 1000 }),
	});

	if (stagesLoading || dealsLoading) {
		return <Skeleton className="h-64 w-full" />;
	}

	const columns = (stages || []).map((stage: PipelineStageResponse) => ({
		id: stage.id,
		title: stage.name,
		items: (deals || []).filter(
			(d: DealResponse) => d.pipeline_stage_id === stage.id,
		),
	}));

	const handleDragEnd = (_newColumns: any[]) => {
		queryClient.invalidateQueries({ queryKey: ["cinq", "deals"] });
		toast.info(t`Deal moved (refresh to see changes)`);
	};

	const renderItem = (deal: DealResponse) => (
		<div
			className="p-3 bg-deep-night/50 border border-gray-700/40 rounded-lg cursor-pointer hover:border-amber/50 transition-colors"
			onClick={() => navigate({ to: `/deals/${deal.id}` })}
			data-tour="deal-card"
		>
			<div className="font-medium">{deal.title}</div>
			<div className="text-sm text-muted-foreground">
				${deal.amount.toLocaleString()}
			</div>
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
