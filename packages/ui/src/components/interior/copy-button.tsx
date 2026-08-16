// packages/ui/src/components/interior/copy-button.tsx
// interior.dev Action Feedback — CopyButton (copied per interior.dev license).
// Single runtime dependency: motion.

import { motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

const MORPH = {
	type: "spring",
	stiffness: 420,
	damping: 32,
	mass: 0.6,
} as const;
const INSTANT = { duration: 0 } as const;

export type UseCopyToClipboardOptions = {
	value: string;
	timeout?: number;
	onCopy?: (value: string) => void;
	onError?: (reason: unknown) => void;
};

export function useCopyToClipboard({
	value,
	timeout = 2000,
	onCopy,
	onError,
}: UseCopyToClipboardOptions) {
	const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const alive = useRef(true);

	const copy = useCallback(() => {
		if (!value) return Promise.resolve(false);
		return navigator.clipboard
			.writeText(value)
			.then(() => {
				if (!alive.current) return false;
				setStatus("copied");
				onCopy?.(value);
				if (timer.current) clearTimeout(timer.current);
				timer.current = setTimeout(
					() => alive.current && setStatus("idle"),
					timeout,
				);
				return true;
			})
			.catch((reason: unknown) => {
				if (!alive.current) return false;
				setStatus("error");
				onError?.(reason);
				if (timer.current) clearTimeout(timer.current);
				timer.current = setTimeout(
					() => alive.current && setStatus("idle"),
					timeout,
				);
				return false;
			});
	}, [value, timeout, onCopy, onError]);

	useEffect(() => {
		alive.current = true;
		return () => {
			alive.current = false;
			if (timer.current) clearTimeout(timer.current);
		};
	}, []);

	return { copy, status, copied: status === "copied" };
}

export type CopyButtonProps = {
	value: string;
	label?: string;
	copiedLabel?: string;
	errorLabel?: string;
	timeout?: number;
	onCopy?: (value: string) => void;
	onError?: (reason: unknown) => void;
	disabled?: boolean;
	className?: string;
};

export function CopyButton({
	value,
	label = "Copy",
	copiedLabel = "Copied",
	errorLabel = "Failed",
	timeout = 2000,
	onCopy,
	onError,
	disabled = false,
	className = "",
}: CopyButtonProps) {
	const reduced = useReducedMotion();
	const { copy, status } = useCopyToClipboard({
		value,
		timeout,
		onCopy,
		onError,
	});
	const spring = reduced ? INSTANT : MORPH;

	return (
		<button
			type="button"
			disabled={disabled}
			onClick={() => void copy()}
			className={`relative inline-flex h-8 items-center gap-1.5 rounded-[9px] border border-stone-200 bg-white px-2.5 text-[13px] font-medium text-stone-700 outline-none transition-colors hover:bg-stone-50 focus-visible:border-[#4568FF] disabled:opacity-50 dark:border-white/[0.16] dark:bg-[#252522] dark:text-stone-200 dark:hover:bg-[#2A2A27] ${className}`}
		>
			<span className="relative grid h-4 w-4 place-items-center">
				<motion.svg
					key="copy"
					initial={false}
					animate={{
						opacity: status === "idle" ? 1 : 0,
						scale: status === "idle" ? 1 : 0.6,
					}}
					transition={spring}
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth={2}
					className="col-start-1 row-start-1 h-4 w-4"
					aria-hidden
				>
					<rect x="9" y="9" width="11" height="11" rx="2" />
					<path d="M5 15V5a2 2 0 0 1 2-2h10" />
				</motion.svg>
				<motion.svg
					key="check"
					initial={false}
					animate={{
						opacity: status === "copied" ? 1 : 0,
						scale: status === "copied" ? 1 : 0.6,
					}}
					transition={spring}
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth={2}
					className="col-start-1 row-start-1 h-4 w-4 text-emerald-600 dark:text-emerald-400"
					aria-hidden
				>
					<path d="M20 6 9 17l-5-5" />
				</motion.svg>
			</span>
			<span>
				{status === "copied"
					? copiedLabel
					: status === "error"
						? errorLabel
						: label}
			</span>
		</button>
	);
}
