// packages/ui/src/components/interior/streaming-text.tsx
// interior.dev Async — StreamingText (copied per interior.dev license). Single dep: motion.

import { useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

export type UseStreamingTextOptions = {
	text: string;
	tokensPerSecond?: number;
	autoStart?: boolean;
};

export function useStreamingText({
	text,
	tokensPerSecond = 18,
	autoStart = true,
}: UseStreamingTextOptions) {
	const [visible, setVisible] = useState(0);
	const [status, setStatus] = useState<"idle" | "streaming" | "done">("idle");
	const timer = useRef<ReturnType<typeof setInterval> | null>(null);
	const alive = useRef(true);

	const tokens = text.split(/(\s+)/);
	const start = () => {
		if (timer.current) clearInterval(timer.current);
		setStatus("streaming");
		setVisible(0);
		const interval = 1000 / tokensPerSecond;
		timer.current = setInterval(() => {
			setVisible((v) => {
				if (v >= tokens.length) {
					if (timer.current) clearInterval(timer.current);
					setStatus("done");
					return v;
				}
				return v + 1;
			});
		}, interval);
	};
	const pause = () => {
		if (timer.current) clearInterval(timer.current);
		setStatus("idle");
	};
	const skip = () => {
		if (timer.current) clearInterval(timer.current);
		setVisible(tokens.length);
		setStatus("done");
	};
	const reset = () => {
		if (timer.current) clearInterval(timer.current);
		setVisible(0);
		setStatus("idle");
	};

	useEffect(() => {
		alive.current = true;
		if (autoStart) start();
		return () => {
			alive.current = false;
			if (timer.current) clearInterval(timer.current);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [text, tokensPerSecond, autoStart]);

	return {
		visible: tokens.slice(0, visible).join(""),
		status,
		start,
		pause,
		skip,
		reset,
	};
}

export type StreamingTextProps = UseStreamingTextOptions & {
	showSkip?: boolean;
	label?: string;
	onDone?: () => void;
	className?: string;
};

export function StreamingText({
	text,
	tokensPerSecond = 18,
	autoStart = true,
	showSkip = true,
	label,
	onDone,
	className = "",
}: StreamingTextProps) {
	const reduced = useReducedMotion();
	const { visible, status, skip } = useStreamingText({
		text,
		tokensPerSecond,
		autoStart: reduced ? false : autoStart,
	});

	useEffect(() => {
		if (status === "done") onDone?.();
	}, [status, onDone]);

	return (
		<div className={className}>
			<p aria-label={label}>{reduced ? text : visible}</p>
			{showSkip && status === "streaming" && (
				<button
					type="button"
					onClick={skip}
					className="mt-1 text-xs text-stone-400 underline"
				>
					Skip
				</button>
			)}
		</div>
	);
}
