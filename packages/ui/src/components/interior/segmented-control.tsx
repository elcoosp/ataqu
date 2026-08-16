// packages/ui/src/components/interior/segmented-control.tsx
// interior.dev Navigation — SegmentedControl (copied per interior.dev license).
// Single runtime dependency: motion.

import { motion, useReducedMotion } from "motion/react";
import { useId, useRef, useState } from "react";

const SPRING = {
	type: "spring",
	stiffness: 420,
	damping: 34,
	mass: 0.6,
} as const;
const INSTANT = { duration: 0 } as const;

export type SegmentedOption = {
	value: string;
	label: React.ReactNode;
	disabled?: boolean;
};

export type SegmentedControlProps = {
	options: SegmentedOption[];
	label: string;
	value?: string;
	defaultValue?: string;
	onValueChange?: (value: string) => void;
	className?: string;
};

export function SegmentedControl({
	options,
	label,
	value,
	defaultValue,
	onValueChange,
	className = "",
}: SegmentedControlProps) {
	const reactId = useId();
	const reduced = useReducedMotion();
	const controlled = value !== undefined;
	const [internal, setInternal] = useState(defaultValue ?? options[0]?.value);
	const selected = controlled ? value : internal;
	const refs = useRef<Record<string, HTMLButtonElement | null>>({});

	const select = (next: string) => {
		if (controlled) onValueChange?.(next);
		else {
			setInternal(next);
			onValueChange?.(next);
		}
	};

	return (
		<div
			role="radiogroup"
			aria-label={label}
			className={`inline-flex rounded-[10px] border border-stone-200 bg-stone-100 p-0.5 dark:border-white/[0.12] dark:bg-[#1d1d1a] ${className}`}
		>
			{options.map((opt) => {
				const active = opt.value === selected;
				return (
					<button
						key={opt.value}
						ref={(el) => {
							refs.current[opt.value] = el;
						}}
						type="button"
						role="radio"
						aria-checked={active}
						disabled={opt.disabled}
						onClick={() => select(opt.value)}
						className="relative inline-flex h-8 items-center rounded-[8px] px-3 text-[13px] font-medium outline-none transition-colors disabled:opacity-40"
					>
						{active && (
							<motion.span
								layoutId={`seg-${reactId}`}
								initial={false}
								transition={reduced ? INSTANT : SPRING}
								className="absolute inset-0 rounded-[8px] bg-white shadow-[0_1px_2px_rgba(28,25,23,0.12)] dark:bg-[#2f2f2b]"
							/>
						)}
						<span
							className={
								active
									? "relative text-stone-800 dark:text-stone-100"
									: "relative text-stone-500 dark:text-stone-400"
							}
						>
							{opt.label}
						</span>
					</button>
				);
			})}
		</div>
	);
}
