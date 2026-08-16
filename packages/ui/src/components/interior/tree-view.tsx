// packages/ui/src/components/interior/tree-view.tsx
// interior.dev Navigation — TreeView (copied per interior.dev license). Single dep: motion.

import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";

const EXPAND = { duration: 0.22, ease: [0.22, 1, 0.36, 1] } as const;
const INSTANT = { duration: 0 } as const;

export type TreeNode = {
	id: string;
	label: React.ReactNode;
	meta?: React.ReactNode;
	children?: TreeNode[];
};

export type UseTreeViewOptions = {
	nodes: TreeNode[];
	defaultExpanded?: string[];
	expanded?: string[];
	onExpandedChange?: (expanded: string[]) => void;
	defaultSelected?: string | null;
	selected?: string | null;
	onSelectedChange?: (selected: string) => void;
};

export function useTreeView({
	nodes,
	defaultExpanded = [],
	expanded,
	defaultSelected = null,
	selected,
	onExpandedChange,
	onSelectedChange,
}: UseTreeViewOptions) {
	const [internalExpanded, setInternalExpanded] =
		useState<string[]>(defaultExpanded);
	const [internalSelected, setInternalSelected] = useState<string | null>(
		defaultSelected,
	);
	const expandedSet = new Set(expanded ?? internalExpanded);
	const selectedId = selected ?? internalSelected;

	const toggle = (id: string) => {
		const next = new Set(expandedSet);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		if (expanded === undefined) setInternalExpanded([...next]);
		onExpandedChange?.([...next]);
	};
	const select = (id: string) => {
		if (selected === undefined) setInternalSelected(id);
		onSelectedChange?.(id);
	};
	return { expandedSet, selectedId, toggle, select };
}

export type TreeViewProps = UseTreeViewOptions & {
	label: string;
	className?: string;
};

export function TreeView({
	nodes,
	label,
	className = "",
	...rest
}: TreeViewProps) {
	const reduced = useReducedMotion();
	const { expandedSet, selectedId, toggle, select } = useTreeView({
		nodes,
		...rest,
	});
	const spring = reduced ? INSTANT : EXPAND;

	const render = (list: TreeNode[], depth: number): React.ReactNode =>
		list.map((node) => {
			const open = expandedSet.has(node.id);
			const hasChildren = !!node.children?.length;
			return (
				<div key={node.id}>
					<div
						role="treeitem"
						aria-expanded={hasChildren ? open : undefined}
						aria-selected={selectedId === node.id}
						tabIndex={0}
						onClick={() => {
							if (hasChildren) toggle(node.id);
							select(node.id);
						}}
						onKeyDown={(e) => {
							if (e.key === "Enter" || e.key === " ") {
								e.preventDefault();
								if (hasChildren) toggle(node.id);
								select(node.id);
							}
						}}
						className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-[14px] ${
							selectedId === node.id
								? "bg-[#4568FF]/10 text-[#4568FF]"
								: "text-stone-700 dark:text-stone-200"
						}`}
						style={{ paddingLeft: depth * 16 + 8 }}
					>
						{hasChildren && (
							<motion.span
								animate={{ rotate: open ? 90 : 0 }}
								transition={spring}
								aria-hidden
							>
								▶
							</motion.span>
						)}
						<span className="flex-1">{node.label}</span>
						{node.meta && (
							<span className="text-xs text-stone-400">{node.meta}</span>
						)}
					</div>
					{hasChildren && (
						<motion.div
							initial={false}
							animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
							transition={spring}
							style={{ overflow: "hidden" }}
						>
							{render(node.children!, depth + 1)}
						</motion.div>
					)}
				</div>
			);
		});

	return (
		<div role="tree" aria-label={label} className={className}>
			{render(nodes, 0)}
		</div>
	);
}
