import { Button, DashboardLayout, OnboardTour } from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { CreateDealDialog } from "../components/create-deal-dialog";
import { CreatePipelineStageDialog } from "../components/create-pipeline-stage-dialog";
import { DealKanban } from "../components/deal-kanban";

export const Route = createFileRoute("/_auth/deals/")({
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
	const [openCreate, setOpenCreate] = useState(false);
	const [openStage, setOpenStage] = useState(false);
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
