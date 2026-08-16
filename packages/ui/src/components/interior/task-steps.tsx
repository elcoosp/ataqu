// packages/ui/src/components/interior/task-steps.tsx
// interior.dev Async — TaskSteps (copied per interior.dev license). Single dep: motion.

import { motion, useReducedMotion } from "motion/react";

const EXPAND = { duration: 0.24, ease: [0.22, 1, 0.36, 1] } as const;
const INSTANT = { duration: 0 } as const;

export type TaskStep = {
	id: string;
	label: React.ReactNode;
	meta?: React.ReactNode;
};

export type UseTaskStepsOptions = {
	steps: TaskStep[];
	current: number;
	failed?: boolean;
};

export function useTaskSteps({
	steps,
	current,
	failed = false,
}: UseTaskStepsOptions) {
	const complete = current >= steps.length && !failed;
	const rows = steps.map((s, i) => ({
		...s,
		state:
			i < current
				? "done"
				: i === current
					? failed
						? "failed"
						: "active"
					: "todo",
	}));
	const sentence = complete
		? "All steps complete"
		: failed
			? `Failed at step ${current + 1}: ${steps[current]?.label ?? ""}`
			: `Step ${current + 1} of ${steps.length}: ${steps[current]?.label ?? ""}`;
	return { rows, complete, failed, sentence };
}

export type TaskStepsProps = UseTaskStepsOptions & {
	label?: string;
	className?: string;
};

export function TaskSteps({
	steps,
	current,
	failed = false,
	label = "Task progress",
	className = "",
}: TaskStepsProps) {
	const reduced = useReducedMotion();
	const spring = reduced ? INSTANT : EXPAND;
	const { rows, sentence } = useTaskSteps({ steps, current, failed });

	return (
		<div role="status" aria-label={label} className={className}>
			<ol className="space-y-2">
				{rows.map((row, i) => (
					<li key={row.id} className="flex items-center gap-3">
						<motion.span
							initial={false}
							animate={{
								backgroundColor:
									row.state === "done"
										? "#10b981"
										: row.state === "active"
											? "#4568FF"
											: row.state === "failed"
												? "#ef4444"
												: "#a8a29e",
							}}
							transition={spring}
							className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-medium text-white"
						>
							{row.state === "done"
								? "✓"
								: row.state === "failed"
									? "!"
									: i + 1}
						</motion.span>
						<div className="flex-1">
							<span
								className={`text-[14px] ${row.state === "todo" ? "text-stone-400" : "text-stone-700 dark:text-stone-200"}`}
							>
								{row.label}
							</span>
							{row.meta && (
								<span className="ml-2 text-xs text-stone-400">{row.meta}</span>
							)}
						</div>
					</li>
				))}
			</ol>
			<p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
				{sentence}
			</p>
		</div>
	);
}
