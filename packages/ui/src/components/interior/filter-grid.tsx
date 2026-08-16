// packages/ui/src/components/interior/filter-grid.tsx
// interior.dev Data — FilterGrid (copied per interior.dev license). Single dep: motion.

import { motion, useReducedMotion } from "motion/react";
import { useMemo, useState } from "react";
import { cn } from "../../lib/utils";

const SPRING = {
	type: "spring",
	stiffness: 420,
	damping: 34,
	mass: 0.6,
} as const;
const INSTANT = { duration: 0 } as const;

export type FilterDefinition<T> = {
	id: string;
	label: string;
	match: (item: T) => boolean;
};

export type UseFilterGridOptions<T> = {
	items: T[];
	filters: FilterDefinition<T>[];
	getKey: (item: T) => string;
	value?: string;
	defaultValue?: string;
	onValueChange?: (id: string) => void;
};

export function useFilterGrid<T>({
	items,
	filters,
	getKey,
	value,
	defaultValue = "all",
	onValueChange,
}: UseFilterGridOptions<T>) {
	const [internal, setInternal] = useState(defaultValue);
	const active = value ?? internal;

	const select = (id: string) => {
		if (value === undefined) setInternal(id);
		onValueChange?.(id);
	};

	const visible = useMemo(() => {
		const f = filters.find((x) => x.id === active);
		return f ? items.filter(f.match) : items;
	}, [items, filters, active]);

	const counts = useMemo(() => {
		const map: Record<string, number> = { all: items.length };
		for (const f of filters) map[f.id] = items.filter(f.match).length;
		return map;
	}, [items, filters]);

	return {
		active,
		activeLabel: filters.find((f) => f.id === active)?.label ?? "All",
		select,
		visible,
		counts,
		total: items.length,
	};
}

export type FilterGridProps<T> = UseFilterGridOptions<T> & {
	renderItem: (item: T) => React.ReactNode;
	label: string;
	columns?: number;
	rowHeight?: number;
	gap?: number;
	emptyLabel?: string;
	className?: string;
};

export function FilterGrid<T>({
	items,
	filters,
	getKey,
	label,
	renderItem,
	columns = 3,
	rowHeight = 72,
	gap = 8,
	emptyLabel = "Nothing matches this filter",
	className = "",
	...rest
}: FilterGridProps<T>) {
	const reduced = useReducedMotion();
	const spring = reduced ? INSTANT : SPRING;
	const { active, select, visible, counts, total } = useFilterGrid({
		items,
		filters,
		getKey,
		...rest,
	});

	return (
		<div className={className}>
			<div
				role="tablist"
				aria-label={label}
				className="mb-3 flex flex-wrap gap-1.5"
			>
				<button
					type="button"
					role="tab"
					aria-selected={active === "all"}
					onClick={() => select("all")}
					className={cn(
						"rounded-full px-3 py-1 text-[13px]",
						active === "all"
							? "bg-[#4568FF] text-white"
							: "bg-stone-100 text-stone-600 dark:bg-[#2a2a27] dark:text-stone-300",
					)}
				>
					All · {total}
				</button>
				{filters.map((f) => (
					<button
						key={f.id}
						type="button"
						role="tab"
						aria-selected={active === f.id}
						onClick={() => select(f.id)}
						className={cn(
							"rounded-full px-3 py-1 text-[13px]",
							active === f.id
								? "bg-[#4568FF] text-white"
								: "bg-stone-100 text-stone-600 dark:bg-[#2a2a27] dark:text-stone-300",
						)}
					>
						{f.label} · {counts[f.id] ?? 0}
					</button>
				))}
			</div>
			{visible.length === 0 ? (
				<p className="text-sm text-stone-400">{emptyLabel}</p>
			) : (
				<motion.div
					layout
					className="grid"
					style={{
						gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
						gap,
					}}
				>
					{visible.map((item) => (
						<motion.div
							key={getKey(item)}
							layout
							initial={{ opacity: 0, scale: 0.96 }}
							animate={{ opacity: 1, scale: 1 }}
							transition={spring}
							style={{ minHeight: rowHeight }}
						>
							{renderItem(item)}
						</motion.div>
					))}
				</motion.div>
			)}
		</div>
	);
}
