// packages/ui/src/components/interior/inline-validation.tsx
// interior.dev Input — InlineValidation (copied per interior.dev license).
// Single runtime dependency: motion.

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";

const CROSSFADE = {
	type: "spring",
	stiffness: 260,
	damping: 30,
	mass: 0.6,
} as const;
const INSTANT = { duration: 0 } as const;

export type UseInlineValidationOptions = {
	value: string;
	validate: (value: string) => string | null;
	debounce?: number;
};

export function useInlineValidation({
	value,
	validate,
	debounce = 400,
}: UseInlineValidationOptions) {
	const [status, setStatus] = useState<
		"idle" | "pending" | "valid" | "invalid"
	>("idle");
	const [error, setError] = useState<string | null>(null);
	const [message, setMessage] = useState<string | null>(null);
	const [touched, setTouched] = useState(false);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const alive = useRef(true);

	useEffect(() => {
		alive.current = true;
		return () => {
			alive.current = false;
			if (timer.current) clearTimeout(timer.current);
		};
	}, []);

	useEffect(() => {
		if (timer.current) clearTimeout(timer.current);
		if (value.length === 0) {
			setStatus("idle");
			setError(null);
			setMessage(null);
			return;
		}
		setStatus("pending");
		timer.current = setTimeout(() => {
			if (!alive.current) return;
			const result = validate(value);
			if (result) {
				setStatus("invalid");
				setError(result);
				setMessage(null);
			} else {
				setStatus("valid");
				setError(null);
				setMessage("Looks good");
			}
		}, debounce);
	}, [value, validate, debounce]);

	const commit = () => setTouched(true);
	const reset = () => {
		setTouched(false);
		setStatus("idle");
		setError(null);
		setMessage(null);
	};
	const fieldProps = { onBlur: commit };

	return { status, error, message, touched, commit, reset, fieldProps };
}

export type InlineValidationProps = {
	label: string;
	value: string;
	onChange: (value: string) => void;
	validate: (value: string) => string | null;
	hint?: string;
	debounce?: number;
	type?: "text" | "email" | "password" | "search" | "tel" | "url";
	placeholder?: string;
	autoComplete?: string;
	inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
	disabled?: boolean;
	required?: boolean;
	className?: string;
};

export function InlineValidation({
	label,
	value,
	onChange,
	validate,
	hint,
	debounce = 400,
	type = "text",
	placeholder,
	autoComplete,
	inputMode,
	disabled,
	required,
	className = "",
}: InlineValidationProps) {
	const reactId = useId();
	const reduced = useReducedMotion();
	const { status, error, message, touched, fieldProps } = useInlineValidation({
		value,
		validate,
		debounce,
	});
	const spring = reduced ? INSTANT : CROSSFADE;
	const show = touched && (status === "invalid" || status === "valid");

	return (
		<div className={className}>
			<label
				htmlFor={reactId}
				className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-200"
			>
				{label}
			</label>
			<input
				{...fieldProps}
				id={reactId}
				type={type}
				value={value}
				placeholder={placeholder}
				autoComplete={autoComplete}
				inputMode={inputMode}
				disabled={disabled}
				required={required}
				onChange={(event) => onChange(event.target.value)}
				className="h-10 w-full rounded-[9px] border border-stone-200 bg-white px-3 text-[14px] text-stone-800 outline-none transition-colors focus-visible:border-[#4568FF] disabled:opacity-50 dark:border-white/[0.16] dark:bg-[#252522] dark:text-stone-100"
			/>
			<div className="relative mt-1 h-4">
				<motion.p
					initial={false}
					animate={{ opacity: show ? 1 : 0, y: show ? 0 : -4 }}
					transition={spring}
					className={
						status === "invalid"
							? "text-xs text-red-600 dark:text-red-400"
							: "text-xs text-emerald-600 dark:text-emerald-400"
					}
				>
					{status === "invalid" ? error : message}
				</motion.p>
			</div>
			{hint && !show && (
				<p className="text-xs text-stone-500 dark:text-stone-400">{hint}</p>
			)}
		</div>
	);
}
