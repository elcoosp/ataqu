// packages/ui/src/components/interior/accordion.tsx
// interior.dev Navigation — Accordion (copied per interior.dev license).
// Single runtime dependency: motion. The styled component exposes useAccordion.

import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";

const EXPAND = { duration: 0.28, ease: [0.22, 1, 0.36, 1] } as const;
const INSTANT = { duration: 0 } as const;

export type AccordionItem = {
	id: string;
	title: React.ReactNode;
	content: React.ReactNode;
	meta?: React.ReactNode;
};

export type UseAccordionOptions = {
	items: AccordionItem[];
	type?: "single" | "multiple";
	defaultOpen?: string[];
	open?: string[];
	onOpenChange?: (open: string[]) => void;
	collapsible?: boolean;
};

export function useAccordion({
	items,
	type = "single",
	defaultOpen = [],
	open,
	onOpenChange,
	collapsible = true,
}: UseAccordionOptions) {
	const [internal, setInternal] = useState<string[]>(defaultOpen);
	const controlled = open !== undefined;
	const openSet = new Set(controlled ? open : internal);

	const isOpen = (id: string) => openSet.has(id);

	const toggle = (id: string) => {
		const next = new Set(openSet);
		if (next.has(id)) {
			if (type === "single" && !collapsible) return;
			next.delete(id);
		} else {
			if (type === "single") next.clear();
			next.add(id);
		}
		const arr = items.filter((i) => next.has(i.id)).map((i) => i.id);
		if (!controlled) setInternal(arr);
		onOpenChange?.(arr);
	};

	const getHeaderProps = (id: string) => ({
		onClick: () => toggle(id),
		"aria-expanded": isOpen(id),
	});
	const getPanelProps = (id: string) => ({ id: `panel-${id}` });

	return {
		open: openSet,
		isOpen,
		toggle,
		headerProps: getHeaderProps,
		panelProps: getPanelProps,
	};
}

export type AccordionProps = {
	items: AccordionItem[];
	type?: "single" | "multiple";
	defaultOpen?: string[];
	open?: string[];
	onOpenChange?: (open: string[]) => void;
	collapsible?: boolean;
	headingLevel?: number;
	className?: string;
};

export function Accordion({
	items,
	type = "single",
	defaultOpen,
	open,
	onOpenChange,
	collapsible = true,
	headingLevel = 3,
	className = "",
}: AccordionProps) {
	const reduced = useReducedMotion();
	const { isOpen, toggle, headerProps, panelProps } = useAccordion({
		items,
		type,
		defaultOpen,
		open,
		onOpenChange,
		collapsible,
	});
	const spring = reduced ? INSTANT : EXPAND;
	const Heading =
		`h${Math.min(Math.max(headingLevel, 1), 6)}` as keyof React.JSX.IntrinsicElements;

	return (
		<div className={className}>
			{items.map((item) => {
				const expanded = isOpen(item.id);
				const panelId = panelProps(item.id).id;
				return (
					<div
						key={item.id}
						className="border-b border-stone-200 dark:border-white/[0.12]"
					>
						<Heading className="m-0">
							<button
								type="button"
								{...headerProps(item.id)}
								aria-controls={panelId}
								className="flex w-full items-center justify-between gap-2 py-3 text-left text-[14px] font-medium text-stone-800 dark:text-stone-100"
							>
								<span>{item.title}</span>
								<motion.span
									animate={{ rotate: expanded ? 180 : 0 }}
									transition={spring}
									aria-hidden
								>
									▼
								</motion.span>
							</button>
						</Heading>
						<motion.div
							initial={false}
							animate={{
								height: expanded ? "auto" : 0,
								opacity: expanded ? 1 : 0,
							}}
							transition={spring}
							style={{ overflow: "hidden" }}
							id={panelId}
							role="region"
						>
							<div className="pb-3 text-[14px] text-stone-600 dark:text-stone-300">
								{item.content}
							</div>
						</motion.div>
					</div>
				);
			})}
		</div>
	);
}
