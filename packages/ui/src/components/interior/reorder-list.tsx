// packages/ui/src/components/interior/reorder-list.tsx
// interior.dev Gesture — ReorderList (copied per interior.dev license). Single dep: motion.

import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";

const SPRING = {
	type: "spring",
	stiffness: 500,
	damping: 38,
	mass: 0.7,
} as const;
const INSTANT = { duration: 0 } as const;

export type UseReorderListOptions<T> = {
	items: T[];
	getId: (item: T) => string;
	getLabel: (item: T) => string;
	onReorder: (next: T[]) => void;
	onCommit?: (next: T[]) => void;
	disabled?: boolean;
};

export function useReorderList<T>({
	items,
	getId,
	getLabel,
	onReorder,
	onCommit,
	disabled = false,
}: UseReorderListOptions<T>) {
	const [internal, setInternal] = useState<T[]>(items);
	const [dragging, setDragging] = useState<string | null>(null);
	const list = internal;

	const move = (fromId: string, toId: string) => {
		const from = list.findIndex((i) => getId(i) === fromId);
		const to = list.findIndex((i) => getId(i) === toId);
		if (from === -1 || to === -1 || from === to) return;
		const next = [...list];
		const [moved] = next.splice(from, 1);
		next.splice(to, 0, moved);
		setInternal(next);
		onReorder(next);
	};

	const commit = () => {
		onCommit?.(list);
		setDragging(null);
	};

	return { list, dragging, setDragging, move, commit, getLabel, disabled };
}

export type ReorderListProps<T> = UseReorderListOptions<T> & {
	label: string;
	className?: string;
};

export function ReorderList<T>({
	items,
	getId,
	getLabel,
	onReorder,
	onCommit,
	disabled = false,
	label,
	className = "",
}: ReorderListProps<T>) {
	const reduced = useReducedMotion();
	const spring = reduced ? INSTANT : SPRING;
	const { list, dragging, setDragging, move, commit } = useReorderList({
		items,
		getId,
		getLabel,
		onReorder,
		onCommit,
		disabled,
	});

	return (
		<ul role="listbox" aria-label={label} className={className}>
			{list.map((item) => {
				const id = getId(item);
				return (
					<motion.li
						key={id}
						layout
						transition={spring}
						draggable={!disabled}
						onDragStart={() => setDragging(id)}
						onDragOver={(e) => {
							e.preventDefault();
							if (dragging && dragging !== id) move(dragging, id);
						}}
						onDragEnd={commit}
						className={`flex items-center gap-2 rounded-[9px] border border-stone-200 bg-white px-3 py-2 text-[14px] text-stone-700 dark:border-white/[0.12] dark:bg-[#252522] dark:text-stone-200 ${disabled ? "opacity-50" : "cursor-grab active:cursor-grabbing"}`}
					>
						<span aria-hidden className="text-stone-400">
							⠿
						</span>
						<span className="flex-1">{getLabel(item)}</span>
					</motion.li>
				);
			})}
		</ul>
	);
}
