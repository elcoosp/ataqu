// packages/ui/src/components/interior/tag-input.tsx
// interior.dev Input — TagInput (copied per interior.dev license). Single dep: motion.

import { motion, useReducedMotion } from "motion/react";
import { useRef, useState } from "react";
import { cn } from "../../lib/utils";

const SPRING = {
	type: "spring",
	stiffness: 480,
	damping: 32,
	mass: 0.6,
} as const;
const INSTANT = { duration: 0 } as const;

export type UseTagInputOptions = {
	value?: string[];
	defaultValue?: string[];
	onChange?: (tags: string[]) => void;
	max?: number;
	separators?: string[];
	allowDuplicates?: boolean;
	validate?: (candidate: string, tags: string[]) => boolean;
};

export function useTagInput({
	value,
	defaultValue = [],
	onChange,
	max,
	separators = [","],
	allowDuplicates = false,
	validate,
}: UseTagInputOptions) {
	const controlled = value !== undefined;
	const [internal, setInternal] = useState<string[]>(defaultValue);
	const tags = controlled ? value : internal;
	const [draft, setDraft] = useState("");
	const [armedIndex, setArmedIndex] = useState<number | null>(null);
	const _alive = useRef(true);

	const commit = (next: string[]) => {
		if (controlled) onChange?.(next);
		else setInternal(next);
	};

	const add = (raw: string) => {
		const candidate = raw.trim();
		if (!candidate) return;
		if (max !== undefined && tags.length >= max) return;
		if (!allowDuplicates && tags.includes(candidate)) return;
		if (validate && !validate(candidate, tags)) return;
		commit([...tags, candidate]);
		setDraft("");
	};

	const removeAt = (i: number) => {
		const next = tags.filter((_, idx) => idx !== i);
		commit(next);
		setArmedIndex(null);
	};

	const inputProps = {
		value: draft,
		onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
			const v = e.target.value;
			if (separators.some((s) => v.includes(s))) {
				v.split(new RegExp(`[${separators.join("")}]`)).forEach((part) => {
					add(part);
				});
			} else {
				setDraft(v);
			}
		},
		onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === "Enter" || separators.includes(e.key)) {
				e.preventDefault();
				add(draft);
			} else if (e.key === "Backspace" && draft === "" && tags.length > 0) {
				if (armedIndex === null) setArmedIndex(tags.length - 1);
				else removeAt(armedIndex);
			} else if (e.key === "ArrowLeft" && armedIndex === null && tags.length) {
				setArmedIndex(tags.length - 1);
			} else if (e.key === "ArrowRight" && armedIndex !== null) {
				setArmedIndex(null);
			}
		},
	};

	return { tags, draft, add, removeAt, armedIndex, inputProps };
}

export type TagInputProps = UseTagInputOptions & {
	label?: string;
	placeholder?: string;
	hint?: string;
	className?: string;
};

export function TagInput({
	value,
	defaultValue,
	onChange,
	max,
	separators = [","],
	allowDuplicates = false,
	validate,
	label = "Tags",
	placeholder = "Add a tag",
	hint,
	className = "",
}: TagInputProps) {
	const reduced = useReducedMotion();
	const spring = reduced ? INSTANT : SPRING;
	const { tags, inputProps, removeAt, armedIndex } = useTagInput({
		value,
		defaultValue,
		onChange,
		max,
		separators,
		allowDuplicates,
		validate,
	});

	return (
		<div className={className}>
			{label && (
				<label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-200">
					{label}
				</label>
			)}
			<div className="flex flex-wrap items-center gap-1.5 rounded-[9px] border border-stone-200 bg-white p-1.5 dark:border-white/[0.16] dark:bg-[#252522]">
				{tags.map((tag, i) => (
					<motion.span
						key={`${tag}-${i}`}
						layout
						initial={{ opacity: 0, scale: 0.8 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={spring}
						className={cn(
							"inline-flex items-center gap-1 rounded-md bg-stone-100 px-2 py-0.5 text-[13px] text-stone-700 dark:bg-[#32322d] dark:text-stone-200",
							armedIndex === i && "ring-2 ring-[#4568FF]",
						)}
					>
						{tag}
						<button
							type="button"
							aria-label={`Remove ${tag}`}
							className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-100"
							onClick={() => removeAt(i)}
						>
							×
						</button>
					</motion.span>
				))}
				<input
					{...inputProps}
					placeholder={tags.length === 0 ? placeholder : ""}
					className="min-w-[80px] flex-1 bg-transparent px-1 py-0.5 text-[13px] outline-none text-stone-800 dark:text-stone-100 placeholder:text-stone-400"
				/>
			</div>
			{hint && (
				<p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
					{hint}
				</p>
			)}
		</div>
	);
}
