import type { DealResponse, PipelineStageResponse } from "@ataqu/api-client";
import {
	listDeals,
	listPipelineStages,
	useUpdatePipelineStage,
} from "@ataqu/api-client";
import { Badge, Button, Input, KanbanBoard, Skeleton } from "@ataqu/ui";
import { t } from "@lingui/core/macro";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
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

	const updateStage = useUpdatePipelineStage({
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["cinq", "pipelineStages"] });
			toast.success(t`Stage updated`);
		},
		onError: () => toast.error(t`Failed to update stage`),
	});

	const [editingStageId, setEditingStageId] = useState<string | null>(null);
	const [stageName, setStageName] = useState("");

	const startStageEdit = (stage: PipelineStageResponse) => {
		setEditingStageId(stage.id);
		setStageName(stage.name);
	};

	const saveStage = (stage: PipelineStageResponse) => {
		updateStage.mutate({
			id: stage.id,
			data: { name: stageName },
			version: stage.version,
		});
		setEditingStageId(null);
	};

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
		<div data-tour="kanban-board" className="space-y-4">
			<div className="flex flex-wrap gap-2">
				{(stages || []).map((stage: PipelineStageResponse) => (
					<div
						key={stage.id}
						className="flex items-center gap-1 rounded-lg border border-border px-2 py-1"
					>
						{editingStageId === stage.id ? (
							<>
								<Input
									className="h-7 w-32"
									value={stageName}
									onChange={(e) => setStageName(e.target.value)}
									autoFocus
								/>
								<Button
									size="sm"
									className="h-7"
									onClick={() => saveStage(stage)}
									disabled={updateStage.isPending}
								>
									{t`Save`}
								</Button>
							</>
						) : (
							<>
								<span className="text-sm">{stage.name}</span>
								<Button
									size="sm"
									variant="ghost"
									className="h-7 px-2"
									onClick={() => startStageEdit(stage)}
								>
									{t`Edit`}
								</Button>
							</>
						)}
					</div>
				))}
			</div>
			<KanbanBoard
				columns={columns}
				onDragEnd={handleDragEnd}
				renderItem={renderItem}
			/>
		</div>
	);
}
