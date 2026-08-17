import { Trans } from "@lingui/react/macro";
import { Check, Circle } from "lucide-react";
import { useState } from "react";

import {
	useCompleteOnboardingTask,
	useOnboardingStatus,
} from "@ataqu/api-client";
import { ACTIVATION_TASKS, activationTaskHref } from "@ataqu/shared-stores";

/**
 * Persistent onboarding activation widget (spec 2.10). Shows the setup progress
 * percentage and a popover listing the activation tasks. State is sourced from
 * the backend (`GET /api/v1/onboarding/status`); completing a task calls
 * `POST /api/v1/onboarding/task-complete`.
 */
export function SetupProgressWidget() {
	const [open, setOpen] = useState(false);
	const { data, isLoading } = useOnboardingStatus();
	const completeTask = useCompleteOnboardingTask();

	const completed = new Set(data?.tasks_completed ?? []);
	const total = ACTIVATION_TASKS.length || 1;
	const done = ACTIVATION_TASKS.filter((t) => completed.has(t.id)).length;
	const pct = Math.round((done / total) * 100);

	return (
		<div className="relative">
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				className="flex items-center gap-2 rounded-full border border-gray-700/60 px-3 py-1 text-xs text-gray-300 hover:text-white hover:border-gray-500 transition-colors"
				aria-label="Setup progress"
			>
				<span
					className={`h-2 w-2 rounded-full ${
						pct === 100 ? "bg-emerald-400" : "bg-amber"
					}`}
				/>
				<Trans>
					Setup {pct}% ({done}/{total})
				</Trans>
			</button>

			{open && (
				<div className="absolute right-0 z-50 mt-2 w-72 rounded-lg border border-gray-700/60 bg-deep-night/95 p-3 shadow-xl backdrop-blur ataqu-glass">
					<p className="mb-2 text-sm font-medium text-white">
						<Trans>Activation checklist</Trans>
					</p>
					{isLoading && (
						<p className="text-xs text-gray-400">
							<Trans>Loading…</Trans>
						</p>
					)}
					<ul className="space-y-1">
						{ACTIVATION_TASKS.map((task) => {
							const isDone = completed.has(task.id);
							return (
								<li key={task.id}>
									<button
										type="button"
										onClick={() => {
											if (!isDone) {
												completeTask.mutate(task.id);
											} else {
												const href = activationTaskHref(task.id);
												if (href) window.location.assign(href);
											}
										}}
										className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-gray-300 hover:bg-white/5"
									>
										{isDone ? (
											<Check className="h-4 w-4 text-emerald-400" />
										) : (
											<Circle className="h-4 w-4 text-gray-500" />
										)}
										<span className={isDone ? "line-through" : ""}>
											{task.label}
										</span>
									</button>
								</li>
							);
						})}
						{!isLoading && ACTIVATION_TASKS.length === 0 && (
							<li className="text-xs text-gray-400">
								<Trans>No setup tasks.</Trans>
							</li>
						)}
					</ul>
				</div>
			)}
		</div>
	);
}
