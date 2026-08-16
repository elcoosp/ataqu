// packages/ui/src/components/interior/sortable-table.tsx
// interior.dev Data — SortableTable (copied per interior.dev license). Single dep: motion.

import { motion, useReducedMotion } from "motion/react";
import { useMemo, useState } from "react";

const SPRING = {
	type: "spring",
	stiffness: 500,
	damping: 36,
	mass: 0.7,
} as const;
const INSTANT = { duration: 0 } as const;

export type SortState = { id: string; dir: "asc" | "desc" } | null;

export type SortableColumn<T> = {
	id: string;
	header: React.ReactNode;
	width?: number;
	align?: "left" | "right" | "center";
	numeric?: boolean;
	sortable?: boolean;
	value?: (row: T) => string | number;
	cell?: (row: T) => React.ReactNode;
};

export type UseSortableRowsOptions<T> = {
	rows: T[];
	columns: SortableColumn<T>[];
	getRowId: (row: T) => string;
	sort?: SortState;
	defaultSort?: SortState;
	onSortChange?: (next: SortState) => void;
};

export function useSortableRows<T>({
	rows,
	columns,
	getRowId,
	sort,
	defaultSort,
	onSortChange,
}: UseSortableRowsOptions<T>) {
	const [internal, setInternal] = useState<SortState>(defaultSort ?? null);
	const state = sort ?? internal;

	const toggle = (id: string) => {
		const col = columns.find((c) => c.id === id);
		if (!col?.sortable) return;
		const next: SortState =
			state?.id === id
				? { id, dir: state.dir === "asc" ? "desc" : "asc" }
				: { id, dir: "asc" };
		if (sort === undefined) setInternal(next);
		onSortChange?.(next);
	};

	const ordered = useMemo(() => {
		if (!state) return rows;
		const col = columns.find((c) => c.id === state.id);
		if (!col?.value) return rows;
		const val = col.value;
		return [...rows].sort((a, b) => {
			const av = val(a);
			const bv = val(b);
			const cmp =
				typeof av === "number" && typeof bv === "number"
					? av - bv
					: String(av).localeCompare(String(bv));
			return state.dir === "asc" ? cmp : -cmp;
		});
	}, [rows, columns, state]);

	const ariaSort = (id: string): "ascending" | "descending" | "none" =>
		state?.id === id
			? state.dir === "asc"
				? "ascending"
				: "descending"
			: "none";

	return { sort: state, ordered, toggle, ariaSort };
}

export type SortableTableProps<T> = UseSortableRowsOptions<T> & {
	label: string;
	rowHeight?: number;
	className?: string;
};

export function SortableTable<T>({
	rows,
	columns,
	getRowId,
	label,
	rowHeight = 44,
	className = "",
	...rest
}: SortableTableProps<T>) {
	const reduced = useReducedMotion();
	const spring = reduced ? INSTANT : SPRING;
	const { sort, ordered, toggle, ariaSort } = useSortableRows({
		rows,
		columns,
		getRowId,
		...rest,
	});

	return (
		<div
			role="table"
			aria-label={label}
			className={`overflow-hidden rounded-[10px] border border-stone-200 dark:border-white/[0.12] ${className}`}
		>
			<div
				role="row"
				className="flex border-b border-stone-200 bg-stone-50 dark:border-white/[0.12] dark:bg-[#1d1d1a]"
			>
				{columns.map((col) => (
					<div
						key={col.id}
						role="columnheader"
						aria-sort={ariaSort(col.id)}
						style={{
							width: col.width,
							flex: col.width ? undefined : 1,
							textAlign: col.align,
						}}
						className="px-3 py-2 text-[13px] font-medium text-stone-600 dark:text-stone-300"
					>
						{col.sortable ? (
							<button
								type="button"
								onClick={() => toggle(col.id)}
								className="inline-flex items-center gap-1"
							>
								{col.header}
								<span className="text-[10px]">
									{sort?.id === col.id ? (sort.dir === "asc" ? "▲" : "▼") : ""}
								</span>
							</button>
						) : (
							col.header
						)}
					</div>
				))}
			</div>
			{ordered.map((row) => (
				<motion.div
					key={getRowId(row)}
					layout
					transition={spring}
					role="row"
					style={{ height: rowHeight }}
					className="flex items-center border-b border-stone-100 last:border-0 dark:border-white/[0.06]"
				>
					{columns.map((col) => (
						<div
							key={col.id}
							role="cell"
							style={{
								width: col.width,
								flex: col.width ? undefined : 1,
								textAlign: col.align,
							}}
							className="px-3 text-[14px] text-stone-700 dark:text-stone-200"
						>
							{col.cell
								? col.cell(row)
								: col.value
									? String(col.value(row))
									: null}
						</div>
					))}
				</motion.div>
			))}
		</div>
	);
}
