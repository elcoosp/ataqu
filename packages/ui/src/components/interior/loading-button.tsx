// packages/ui/src/components/interior/loading-button.tsx
// interior.dev Action Feedback — LoadingButton (copied per interior.dev license).
// Single runtime dependency: motion.

import { motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

const _CELL = {
	type: "spring",
	stiffness: 520,
	damping: 34,
	mass: 0.45,
} as const;
const CROSSFADE = {
	type: "spring",
	stiffness: 260,
	damping: 34,
	mass: 0.8,
} as const;
const INSTANT = { duration: 0 } as const;

export type AsyncActionStatus = "idle" | "pending" | "success" | "error";

export type UseAsyncActionOptions = {
	action: () => unknown;
	resetAfter?: number;
	onError?: (error: unknown) => void;
};

export function useAsyncAction({
	action,
	resetAfter = 1400,
	onError,
}: UseAsyncActionOptions) {
	const [status, setStatus] = useState<AsyncActionStatus>("idle");
	const phase = useRef<AsyncActionStatus>("idle");
	const runId = useRef(0);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const alive = useRef(true);
	const act = useRef(action);
	const fail = useRef(onError);

	useEffect(() => {
		act.current = action;
		fail.current = onError;
	});

	const clear = useCallback(() => {
		if (timer.current) {
			clearTimeout(timer.current);
			timer.current = null;
		}
	}, []);

	const reset = useCallback(() => {
		runId.current += 1;
		clear();
		phase.current = "idle";
		setStatus("idle");
	}, [clear]);

	const run = useCallback(() => {
		if (phase.current === "pending") return;
		clear();
		const id = ++runId.current;
		phase.current = "pending";
		setStatus("pending");

		const settle = (next: "success" | "error") => {
			if (!alive.current || id !== runId.current) return;
			clear();
			phase.current = next;
			setStatus(next);
			timer.current = setTimeout(() => {
				if (!alive.current || id !== runId.current) return;
				phase.current = "idle";
				setStatus("idle");
			}, resetAfter);
		};

		Promise.resolve()
			.then(() => act.current())
			.then(
				() => settle("success"),
				(error: unknown) => {
					fail.current?.(error);
					settle("error");
				},
			);
	}, [clear, resetAfter]);

	useEffect(() => {
		alive.current = true;
		return () => {
			alive.current = false;
			clear();
		};
	}, [clear]);

	return { status, run, reset, pending: status === "pending" };
}

export type LoadingButtonProps = {
	onAction: () => unknown;
	children: string;
	pendingLabel?: string;
	successLabel?: string;
	errorLabel?: string;
	resetAfter?: number;
	disabled?: boolean;
	onError?: (error: unknown) => void;
	className?: string;
};

export function LoadingButton({
	onAction,
	children,
	pendingLabel = children,
	successLabel = "Done",
	errorLabel = "Try again",
	resetAfter = 1400,
	disabled = false,
	onError,
	className = "",
}: LoadingButtonProps) {
	const reduced = useReducedMotion();
	const { status, run, pending } = useAsyncAction({
		action: onAction,
		resetAfter,
		onError,
	});
	const fade = reduced ? INSTANT : CROSSFADE;

	const _label =
		status === "pending"
			? pendingLabel
			: status === "success"
				? successLabel
				: status === "error"
					? errorLabel
					: children;

	const faces = [
		{
			key: "idle",
			text: children,
			tone: "text-stone-700 dark:text-stone-200",
			icon: null as React.ReactNode,
		},
		{
			key: "pending",
			text: pendingLabel,
			tone: "text-stone-500 dark:text-stone-400",
			icon: null as React.ReactNode,
		},
		{
			key: "success",
			text: successLabel,
			tone: "text-emerald-600 dark:text-emerald-400",
			icon: null as React.ReactNode,
		},
		{
			key: "error",
			text: errorLabel,
			tone: "text-red-600 dark:text-red-400",
			icon: null as React.ReactNode,
		},
	];

	return (
		<button
			type="button"
			disabled={disabled}
			onClick={(event) => {
				if (pending) {
					event.preventDefault();
					return;
				}
				run();
			}}
			className={`relative inline-flex h-9 select-none items-center justify-center rounded-[9px] border border-stone-200 bg-white px-3.5 text-[13px] font-medium text-stone-700 shadow-[inset_0_1.5px_0_rgba(255,255,255,0.95),inset_0_-1px_0_rgba(28,25,23,0.06),0_1px_2px_rgba(28,25,23,0.08)] outline-none transition-[border-color,box-shadow,background-color] duration-150 hover:bg-stone-50 focus-visible:border-[#4568FF] focus-visible:shadow-[0_1px_2px_rgba(28,25,23,0.08),0_10px_20px_-14px_rgba(69,104,255,0.6)] disabled:opacity-50 dark:border-white/[0.16] dark:bg-[#252522] dark:text-stone-200 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_1px_2px_rgba(0,0,0,0.4)] dark:hover:bg-[#2A2A27] dark:focus-visible:border-[#93B0FF] dark:focus-visible:shadow-[0_10px_20px_-14px_rgba(147,176,255,0.5)] ${className}`}
			style={{ borderRadius: 9, touchAction: "manipulation" }}
		>
			<div className="relative grid place-items-center">
				{faces.map((face) => (
					<motion.span
						key={face.key}
						initial={false}
						animate={{ opacity: status === face.key ? 1 : 0 }}
						transition={fade}
						className={`col-start-1 row-start-1 flex items-center gap-1.5 ${face.tone}`}
						aria-hidden={status !== face.key}
					>
						{face.text}
					</motion.span>
				))}
			</div>
		</button>
	);
}
