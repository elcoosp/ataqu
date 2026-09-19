import {
	type DealResponse,
	useBulkDeleteDeals,
	useListDeals,
} from "@ataqu/api-client";
import { searchSchema, useUrlState } from "@ataqu/shared-hooks";
import { handleApiError } from "@ataqu/shared-utils";
import { Button, DashboardLayout, OnboardTour, useConfirm } from "@ataqu/ui";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { useCallback } from "react";
import { toast } from "sonner";
import { CreateDealDialog } from "../../../../apps/cinq/components/create-deal-dialog";
import { CreatePipelineStageDialog } from "../../../../apps/cinq/components/create-pipeline-stage-dialog";
import { DealKanban } from "../../../../apps/cinq/components/deal-kanban";

export const Route = createFileRoute("/_auth/cinq/deals/")({
	validateSearch: searchSchema({
		createOpen: (raw: unknown) => raw === "1",
		stageOpen: (raw: unknown) => raw === "1",
	}),
	component: DealsIndex,
});

const tourSteps = [
	{
		selector: '[data-tour="kanban-board"]',
		content: (
			<Trans>This is your revenue engine. No 3‑year lock‑in, just deals.</Trans>
		),
	},
	{
		selector: '[data-tour="deal-card"]',
		content: (
			<Trans>
				Drag this to 'Won' to trigger native automations across the OS.
			</Trans>
		),
	},
];

function DealsIndex() {
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	const [openCreate, setOpenCreate] = useUrlState({
		search,
		setSearch: (next) => navigate({ search: next as never }),
		key: "createOpen",
		default: false,
		parse: (raw: unknown) => raw === "1",
		serialize: (v) => (v ? "1" : undefined),
	});
	const [openStage, setOpenStage] = useUrlState({
		search,
		setSearch: (next) => navigate({ search: next as never }),
		key: "stageOpen",
		default: false,
		parse: (raw: unknown) => raw === "1",
		serialize: (v) => (v ? "1" : undefined),
	});
	const queryClient = useQueryClient();
	const confirm = useConfirm();
	const { data: dealsData } = useListDeals({ limit: 100, offset: 0 });
	const bulkDeleteDeals = useBulkDeleteDeals({
		onSuccess: () => {
			// Re-fetch in place instead of window.location.reload() so the
			// removal is a real cache update (no full app remount).
			void queryClient.invalidateQueries({ queryKey: ["deals"] });
			toast.success(t`Deals deleted`);
		},
		onError: (error) => toast.error(handleApiError(error)),
	});
	const allDealIds = (dealsData?.items ?? []).map((d: DealResponse) => d.id);

	const handleDeleteAll = useCallback(async () => {
		const ok = await confirm({
			title: t`Delete all deals?`,
			description: t`${allDealIds.length} deals will be permanently removed. This cannot be undone.`,
			confirmLabel: t`Delete all`,
			destructive: true,
		});
		if (ok) {
			bulkDeleteDeals.mutate({ ids: allDealIds });
		}
	}, [confirm, allDealIds, bulkDeleteDeals]);
	return (
		<OnboardTour tourId="cinq-kanban-tour" steps={tourSteps}>
			<DashboardLayout>
				<div className="p-4">
					<div className="flex items-center justify-between mb-4">
						<h1 className="text-2xl font-bold">
							<Trans>Deals</Trans>
						</h1>
						<div className="flex gap-2">
							<Button
								size="sm"
								variant="outline"
								onClick={() => setOpenStage(true)}
							>
								<Plus className="h-4 w-4 mr-1" />
								<Trans>New Stage</Trans>
							</Button>
							<Button size="sm" onClick={() => setOpenCreate(true)}>
								<Plus className="h-4 w-4 mr-1" />
								<Trans>New Deal</Trans>
							</Button>
							{allDealIds.length > 0 && (
								<Button
									size="sm"
									variant="destructive"
									onClick={() => {
										void handleDeleteAll();
									}}
								>
									<Trash2 className="h-4 w-4 mr-1" />
									<Trans>Delete all</Trans>
								</Button>
							)}
						</div>
					</div>
					<DealKanban />
				</div>
				<CreateDealDialog open={openCreate} onOpenChange={setOpenCreate} />
				<CreatePipelineStageDialog
					open={openStage}
					onOpenChange={setOpenStage}
				/>
			</DashboardLayout>
		</OnboardTour>
	);
}
