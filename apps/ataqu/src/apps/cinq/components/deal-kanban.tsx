import type { DealResponse, PipelineStageResponse } from "@ataqu/api-client";
import {
	updateDeal as updateDealApi,
	useDeleteDeal,
	useDeletePipelineStage,
	useListDeals,
	useListPipelineStages,
	useUpdatePipelineStage,
} from "@ataqu/api-client";
import { useOptimisticMutation } from "@ataqu/shared-hooks";
import { formatNumber } from "@ataqu/shared-utils";
import {
	Badge,
	Bone,
	Button,
	Input,
	KanbanBoard,
	type KanbanColumn,
} from "@ataqu/ui";
import { t } from "@lingui/core/macro";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function DealKanban() {
	const queryClient = useQueryClient();
	const deleteDeal = useDeleteDeal({
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["cinq", "deals"] });
			toast.success("Deal deleted.");
		},
		onError: () => toast.error("Delete failed"),
	});
	const deleteStage = useDeletePipelineStage({
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["cinq", "pipeline"] });
			toast.success("Stage deleted.");
		},
		onError: () => toast.error("Delete failed"),
	});
	const navigate = useNavigate();

	const { data: stages, isLoading: stagesLoading } = useListPipelineStages();

	const { data: deals, isLoading: dealsLoading } = useListDeals({
		limit: 1000,
	});

	const updateStage = useUpdatePipelineStage({
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["cinq", "pipelineStages"] });
			toast.success(t`Stage updated`);
		},
		onError: () => toast.error(t`Failed to update stage`),
	});

	// A drag paints the new column assignment immediately; the API call and
	// the version guard (409 on a lost race) happen in the background, and a
	// rejected move snaps the deal back to its original column.
	const moveDeal = useOptimisticMutation<
		DealResponse,
		{ items: DealResponse[]; total: number } | undefined,
		{ id: string; newStageId: string; version: number }
	>({
		listQueryKey: ["cinq", "deals", { limit: 1000 }],
		mutationFn: ({ id, newStageId, version }) =>
			updateDealApi(id, { pipeline_stage_id: newStageId }, version),
		optimisticUpdate: (old, vars) =>
			old
				? {
						...old,
						items: old.items.map((deal) =>
							deal.id === vars.id
								? {
										...deal,
										pipeline_stage_id: vars.newStageId,
										version: vars.version + 1,
									}
								: deal,
						),
					}
				: old,
		onError: () => toast.error(t`Failed to move deal`),
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
		return (
			<Bone loading name="deals" fallback={<div className="h-64 w-full" />}>
				{null}
			</Bone>
		);
	}

	const columns = (stages || []).map((stage: PipelineStageResponse) => ({
		id: stage.id,
		title: stage.name,
		items: (deals?.items ?? []).filter(
			(d: DealResponse) => d.pipeline_stage_id === stage.id,
		),
	}));

	const handleDragEnd = (newColumns: KanbanColumn<DealResponse>[]) => {
		const originalStageByDeal = new Map<string, string>(
			(deals?.items ?? []).map((d) => [d.id, d.pipeline_stage_id]),
		);
		const movedDeals = newColumns.flatMap((col) =>
			col.items
				.filter((d: DealResponse) => d.pipeline_stage_id !== col.id)
				.map((d: DealResponse) => ({
					dealId: d.id,
					newStageId: col.id,
					version: d.version,
				})),
		);
		if (movedDeals.length > 0) {
			movedDeals.forEach(({ dealId, newStageId, version }) => {
				const originalStage = originalStageByDeal.get(dealId);
				if (originalStage !== newStageId) {
					moveDeal.mutate({ id: dealId, newStageId, version });
				}
			});
			toast.success("Deal moved");
		}
	};

	const renderItem = (deal: DealResponse) => (
		<div
			className="relative p-3 bg-deep-night/50 border border-border/40 rounded-lg cursor-pointer hover:border-amber/50 transition-colors"
			onClick={() => navigate({ to: `/cinq/deals/${deal.id}` })}
			data-tour="deal-card"
		>
			<div className="font-medium">{deal.title}</div>
			<div className="text-sm text-muted-foreground tabular-nums">
				${formatNumber(deal.amount)}
			</div>
			{deal.probability !== null && deal.probability !== undefined && (
				<div className="text-xs">Prob: {deal.probability}%</div>
			)}
			<div className="mt-1">
				<Badge variant="outline">{deal.status}</Badge>
			</div>
			<button
				type="button"
				aria-label="Delete deal"
				className="absolute top-2 right-2 text-destructive hover:text-destructive"
				onClick={(e) => {
					e.stopPropagation();
					deleteDeal.mutate(deal.id);
				}}
			>
				<Trash2 className="h-4 w-4" />
			</button>
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
								<Button
									size="sm"
									variant="ghost"
									className="h-7 px-2 text-destructive hover:text-destructive"
									onClick={() => deleteStage.mutate(stage.id)}
									disabled={deleteStage.isPending}
								>
									{t`Delete`}
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
