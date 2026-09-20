import { searchSchema, stringSearch, useUrlState } from "@ataqu/shared-hooks";
import { useAuthStore } from "@ataqu/shared-stores";
import {
	Button,
	Dialog,
	DialogContent,
	DialogTrigger,
	OnboardTour,
} from "@ataqu/ui";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ApprovalDashboard } from "../../../apps/pause/components/approval-dashboard";
import { LeaveRequestForm } from "../../../apps/pause/components/leave-request-form";

export const Route = createFileRoute("/_auth/pause/leave")({
	component: LeavePage,
});

function LeavePage() {
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	const [isLeaveOpen, setIsLeaveOpen] = useUrlState({
		search,
		setSearch: (next) => navigate({ search: next as never }),
		key: "leaveOpen",
		default: false,
		parse: (raw: unknown) => raw === "1",
		serialize: (v) => (v ? "1" : undefined),
	});
	const user = useAuthStore((s) => s.user);

	return (
		<OnboardTour
			tourId="pause-leave-tour"
			steps={[
				{
					selector: '[data-tour="request-leave"]',
					content: t`No payroll bloat. Just leave tracking.`,
				},
				{
					selector: '[data-tour="pending-list"]',
					content: t`Approve here, and their system access updates automatically via AEGIS.`,
				},
			]}
		>
			<div className="p-8">
				<div className="flex justify-between mb-8">
					<h1 className="text-2xl font-bold">
						<Trans>Leave Requests</Trans>
					</h1>
					<Dialog open={isLeaveOpen} onOpenChange={setIsLeaveOpen}>
						<DialogTrigger asChild>
							<Button>
								<Trans>Request Leave</Trans>
							</Button>
						</DialogTrigger>
						<DialogContent>
							<LeaveRequestForm
								employeeId={user?.id || "unknown"}
								onClose={() => setIsLeaveOpen(false)}
							/>
						</DialogContent>
					</Dialog>
				</div>
				<ApprovalDashboard />
			</div>
		</OnboardTour>
	);
}
