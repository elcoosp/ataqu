import { ACTIVATION_TASKS, useActivationStore } from "@ataqu/shared-stores";
import { Trans } from "@lingui/react/macro";
import { Check, Circle } from "lucide-react";
import { useState } from "react";

/**
 * Persistent onboarding activation widget (spec 2.10). Shows the setup
 * progress percentage and a popover listing the activation tasks.
 */
export function SetupProgressWidget() {
	const [open, setOpen] = useState(false);
	const completed = useActivationStore((s) => s.completed);
	const complete = useActivationStore((s) => s.complete);
	const reset = useActivationStore((s) => s.reset);

	const done = ACTIVATION_TASKS.filter((t) => completed[t.id]).length;
	const total = ACTIVATION_TASKS.length;
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
					<ul className="space-y-1">
						{ACTIVATION_TASKS.map((task) => {
							const isDone = !!completed[task.id];
							return (
								<li key={task.id}>
									<button
										type="button"
										onClick={() =>
											isDone ? reset(task.id) : complete(task.id)
										}
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
					</ul>
				</div>
			)}
		</div>
	);
}
