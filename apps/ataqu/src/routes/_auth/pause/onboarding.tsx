import {
	useCompleteEmployeeOnboardingTask,
	useListEmployees,
} from "@ataqu/api-client";
import { handleApiError } from "@ataqu/shared-utils";
import { Button, Card, ProgressBar, TaskSteps } from "@ataqu/ui";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_auth/pause/onboarding")({
	component: OnboardingPage,
});

const ONBOARDING_STEPS = [
	{ id: "paperwork", label: t`Paperwork` },
	{ id: "equipment", label: t`Equipment` },
	{ id: "training", label: t`Training` },
] as const;

function OnboardingPage() {
	const queryClient = useQueryClient();
	const { data: employeesData, isLoading } = useListEmployees();
	const employees = (employeesData?.items ?? []).filter((e) => e.is_active);

	const completeTask = useCompleteEmployeeOnboardingTask({
		onSuccess: (employee) => {
			queryClient.invalidateQueries({ queryKey: ["pause", "employees"] });
			const pct = Math.round(
				(employee.onboarding_tasks.length / ONBOARDING_STEPS.length) * 100,
			);
			toast.success(
				employee.onboarding_completed_at
					? t`Onboarding complete for ${employee.full_name}`
					: t`Progress saved (${pct}%)`,
			);
		},
		onError: (err) => toast.error(handleApiError(err)),
	});
	const [pendingTask, setPendingTask] = useState<string | null>(null);

	const handleComplete = (employeeId: string, taskId: string) => {
		setPendingTask(taskId);
		completeTask.mutate(
			{ id: employeeId, taskId },
			{ onSettled: () => setPendingTask(null) },
		);
	};

	return (
		<div className="p-8">
			<h1 className="text-2xl font-bold mb-8">
				<Trans>Onboarding</Trans>
			</h1>
			{isLoading ? (
				<div className="py-16 text-center text-sm text-muted-foreground">
					<Trans>Loading…</Trans>
				</div>
			) : employees.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-16 text-center">
					<h3 className="text-lg font-semibold mb-1">
						<Trans>No active onboarding</Trans>
					</h3>
					<p className="text-sm text-muted-foreground">
						<Trans>New hires will appear here.</Trans>
					</p>
				</div>
			) : (
				<div className="space-y-4">
					{employees.map((emp) => {
						// Real progress from the backend (onboarding_tasks column).
						const done = ONBOARDING_STEPS.filter((s) =>
							emp.onboarding_tasks.includes(s.id),
						).length;
						const pct = Math.round((done / ONBOARDING_STEPS.length) * 100);
						return (
							<Card key={emp.id} className="p-4">
								<div className="flex justify-between items-center mb-2">
									<h3 className="font-semibold">{emp.full_name}</h3>
									<span className="text-sm text-muted-foreground">
										{emp.job_title}
									</span>
								</div>
								<TaskSteps
									steps={ONBOARDING_STEPS.map((s) => ({ ...s }))}
									current={done}
								/>
								<div className="mt-3 flex items-center gap-3">
									<div className="flex-1">
										<ProgressBar
											value={pct}
											max={100}
											label={t`Onboarding progress`}
										/>
									</div>
									<span className="text-xs tabular-nums text-muted-foreground">
										{pct}%
									</span>
								</div>
								{!emp.onboarding_completed_at &&
								done < ONBOARDING_STEPS.length ? (
									<div className="mt-3">
										<Button
											size="sm"
											variant="outline"
											disabled={completeTask.isPending}
											onClick={() => {
												const next = ONBOARDING_STEPS[done];
												handleComplete(emp.id, next.id);
											}}
										>
											{completeTask.isPending && pendingTask !== null ? (
												<Trans>Saving…</Trans>
											) : (
												<Trans>
													Mark “{ONBOARDING_STEPS[done]?.label}” done
												</Trans>
											)}
										</Button>
									</div>
								) : null}
							</Card>
						);
					})}
				</div>
			)}
		</div>
	);
}
