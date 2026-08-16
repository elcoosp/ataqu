// packages/ui/src/components/interior/otp-input.tsx
// interior.dev Input — OtpInput (copied per interior.dev license). Single dep: motion.

import { useReducedMotion } from "motion/react";
import { useRef, useState } from "react";

export type OtpInputProps = {
	length?: number;
	mode?: "numeric" | "alphanumeric";
	defaultValue?: string;
	onChange?: (value: string) => void;
	onComplete?: (value: string) => void;
	status?: "idle" | "error" | "success";
	errorMessage?: string;
	successMessage?: string;
	hint?: string;
	label?: string;
	groupEvery?: number;
	disabled?: boolean;
	autoFocus?: boolean;
	className?: string;
};

export function useOtpInput({
	length = 6,
	onChange,
	onComplete,
}: Pick<OtpInputProps, "length" | "onChange" | "onComplete">) {
	const [chars, setChars] = useState<string[]>(Array(length).fill(""));
	const refs = useRef<(HTMLInputElement | null)[]>([]);

	const value = chars.join("");
	const complete = value.length === length && !chars.includes("");

	const setChar = (i: number, ch: string) => {
		const next = [...chars];
		next[i] = ch;
		setChars(next);
		const v = next.join("");
		onChange?.(v);
		if (next.filter(Boolean).length === length && !next.includes(""))
			onComplete?.(v);
	};

	const getCellProps = (i: number) => ({
		ref: (el: HTMLInputElement | null) => {
			refs.current[i] = el;
		},
		value: chars[i] ?? "",
		onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
			const v = e.target.value.replace(/\s/g, "");
			if (!v) {
				setChar(i, "");
				return;
			}
			// support paste
			if (v.length > 1) {
				const arr = v.split("");
				for (let k = 0; k < length - i && k < arr.length; k++)
					setChar(i + k, arr[k]);
				const focus = Math.min(i + arr.length, length - 1);
				refs.current[focus]?.focus();
				return;
			}
			setChar(i, v.slice(-1));
			if (v) refs.current[i + 1]?.focus();
		},
		onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === "Backspace" && !chars[i] && i > 0) {
				refs.current[i - 1]?.focus();
			}
			if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
			if (e.key === "ArrowRight" && i < length - 1)
				refs.current[i + 1]?.focus();
		},
		onFocus: (e: React.FocusEvent<HTMLInputElement>) => e.target.select(),
		inputMode: "text" as const,
		maxLength: length,
	});

	return { chars, value, complete, getCellProps };
}

export function OtpInput({
	length = 6,
	mode = "numeric",
	defaultValue = "",
	onChange,
	onComplete,
	status = "idle",
	errorMessage,
	successMessage,
	hint,
	label = "Verification code",
	groupEvery = 3,
	disabled = false,
	autoFocus = false,
	className = "",
}: OtpInputProps) {
	const reduced = useReducedMotion();
	void reduced;
	const { chars, getCellProps } = useOtpInput({ length, onChange, onComplete });
	const tone =
		status === "error"
			? "border-red-500 dark:border-red-400"
			: status === "success"
				? "border-emerald-500 dark:border-emerald-400"
				: "border-stone-200 dark:border-white/[0.16]";

	return (
		<div className={className}>
			<label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-200">
				{label}
			</label>
			<div className="flex items-center gap-2" role="group" aria-label={label}>
				{Array.from({ length }).map((_, i) => (
					<>
						{i > 0 && i % groupEvery === 0 && (
							<span className="text-stone-400">-</span>
						)}
						<input
							key={i}
							{...getCellProps(i)}
							type={mode === "numeric" ? "text" : "text"}
							pattern={mode === "numeric" ? "[0-9]*" : undefined}
							autoFocus={autoFocus && i === 0}
							disabled={disabled}
							className={`h-11 w-10 rounded-[9px] border bg-white text-center text-lg font-medium text-stone-800 outline-none transition-colors focus-visible:border-[#4568FF] disabled:opacity-50 dark:bg-[#252522] dark:text-stone-100 ${tone}`}
						/>
					</>
				))}
			</div>
			{status === "error" && errorMessage && (
				<p className="mt-1 text-xs text-red-600 dark:text-red-400">
					{errorMessage}
				</p>
			)}
			{status === "success" && successMessage && (
				<p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
					{successMessage}
				</p>
			)}
			{hint && status === "idle" && (
				<p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
					{hint}
				</p>
			)}
		</div>
	);
}
