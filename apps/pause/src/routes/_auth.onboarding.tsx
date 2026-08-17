import { useListEmployees } from "@ataqu/api-client";
import { Card, ProgressBar, Shell, TaskSteps } from "@ataqu/ui";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/onboarding")({
	component: OnboardingPage,
});

function OnboardingPage() {
	const { data: employees } = useListEmployees();

	return (
		<Shell activeApp="pause">
			<div className="p-8">
				<h1 className="text-2xl font-bold mb-8">
					<Trans>Onboarding</Trans>
				</h1>
				{!employees || employees.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-16 text-center">
						<h3 className="text-lg font-semibold mb-1">
							<Trans>No active onboarding</Trans>
						</h3>
						<p className="text-sm text-gray-400">
							<Trans>New hires will appear here.</Trans>
						</p>
					</div>
				) : (
					<div className="space-y-4">
						{employees.map((emp) => (
							<Card key={emp.id} className="p-4">
								<div className="flex justify-between items-center mb-2">
									<h3 className="font-semibold">{emp.full_name}</h3>
									<span className="text-sm text-gray-400">{emp.job_title}</span>
								</div>
								<TaskSteps
									steps={[
										{ id: "paperwork", label: t`Paperwork` },
										{ id: "equipment", label: t`Equipment` },
										{ id: "training", label: t`Training` },
									]}
									current={1}
								/>
								<div className="mt-3">
									<ProgressBar value={50} max={100} label={t`Onboarding progress`} />
								</div>
							</Card>
						))}
					</div>
				)}
			</div>
		</Shell>
	);
}
