// packages/ui/src/components/interior/floating-label-input.tsx
// interior.dev Input — FloatingLabelInput (copied per interior.dev license).
// Single runtime dependency: motion.

import { motion, useReducedMotion } from "motion/react";
import { useId, useRef, useState } from "react";
import { cn } from "../../lib/utils";

const RAISE = {
	type: "spring",
	stiffness: 380,
	damping: 30,
	mass: 0.5,
} as const;
const INSTANT = { duration: 0 } as const;

export type UseFloatingLabelOptions = {
	value?: string;
	defaultValue?: string;
};

export function useFloatingLabel({
	value,
	defaultValue,
}: UseFloatingLabelOptions = {}) {
	const ref = useRef<HTMLInputElement | null>(null);
	const controlled = value !== undefined;
	const filled = controlled
		? value.length > 0
		: (defaultValue?.length ?? 0) > 0;
	const [focused, setFocused] = useState(false);
	const raised = focused || filled;
	const [raisedState, _setRaisedState] = useState(raised);

	const fieldProps = {
		ref,
		value: controlled ? value : undefined,
		defaultValue: controlled ? undefined : defaultValue,
		onFocus: () => setFocused(true),
		onBlur: () => setFocused(false),
	};

	return {
		ref,
		raised: raisedState,
		raisedNow: raised,
		focused,
		filled,
		fieldProps,
	};
}

export type FloatingLabelInputProps = {
	label: string;
	value?: string;
	defaultValue?: string;
	onChange?: (
		value: string,
		event: React.ChangeEvent<HTMLInputElement>,
	) => void;
	hint?: string;
	invalid?: boolean;
	id?: string;
	name?: string;
	type?: "text" | "email" | "password" | "search" | "tel" | "url";
	autoComplete?: string;
	inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
	maxLength?: number;
	required?: boolean;
	disabled?: boolean;
	className?: string;
};

export function FloatingLabelInput({
	label,
	value,
	defaultValue,
	onChange,
	hint,
	invalid = false,
	id,
	name,
	type = "text",
	autoComplete,
	inputMode,
	maxLength,
	required,
	disabled,
	className = "",
}: FloatingLabelInputProps) {
	const reactId = useId();
	const fieldId = id ?? reactId;
	const reduced = useReducedMotion();
	const { ref, raisedNow, fieldProps } = useFloatingLabel({
		value,
		defaultValue,
	});
	const spring = reduced ? INSTANT : RAISE;

	return (
		<div className={cn("relative", className)}>
			<input
				{...fieldProps}
				id={fieldId}
				name={name}
				type={type}
				autoComplete={autoComplete}
				inputMode={inputMode}
				maxLength={maxLength}
				required={required}
				disabled={disabled}
				placeholder=" "
				aria-invalid={invalid}
				onChange={(event) => onChange?.(event.target.value, event)}
				className="peer h-11 w-full rounded-[9px] border border-stone-200 bg-white px-3 pb-1 pt-4 text-[14px] text-stone-800 outline-none transition-colors focus-visible:border-[#4568FF] disabled:opacity-50 dark:border-white/[0.16] dark:bg-[#252522] dark:text-stone-100"
			/>
			<motion.label
				htmlFor={fieldId}
				initial={false}
				animate={{
					y: raisedNow ? -10 : 0,
					scale: raisedNow ? 0.82 : 1,
					color: invalid ? "rgb(220 38 38)" : "rgb(120 113 108)",
				}}
				transition={spring}
				className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 origin-left"
			>
				{label}
			</motion.label>
			{hint && (
				<p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
					{hint}
				</p>
			)}
		</div>
	);
}
