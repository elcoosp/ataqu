// packages/ui/src/components/interior/show-more.tsx
// interior.dev Content — ShowMore (copied per interior.dev license). Single dep: motion.

import { motion, useReducedMotion } from "motion/react";
import { useRef, useState } from "react";

const EXPAND = { duration: 0.26, ease: [0.22, 1, 0.36, 1] } as const;
const INSTANT = { duration: 0 } as const;

export type UseShowMoreOptions = { lines?: number; maxHeight?: number };

export function useShowMore({
	lines = 3,
	maxHeight = 320,
}: UseShowMoreOptions) {
	const contentRef = useRef<HTMLDivElement | null>(null);
	const [expanded, setExpanded] = useState(false);
	const [collapsedHeight, setCollapsedHeight] = useState(0);
	const [fullHeight, setFullHeight] = useState(0);

	return {
		contentRef,
		expanded,
		setExpanded,
		collapsedHeight,
		setCollapsedHeight,
		fullHeight,
		setFullHeight,
		lines,
		maxHeight,
	};
}

export type ShowMoreProps = UseShowMoreOptions & {
	children: React.ReactNode;
	moreLabel?: string;
	lessLabel?: string;
	label?: string;
	className?: string;
};

export function ShowMore({
	children,
	lines = 3,
	maxHeight = 320,
	moreLabel = "Show more",
	lessLabel = "Show less",
	label,
	className = "",
}: ShowMoreProps) {
	const reduced = useReducedMotion();
	const { contentRef, expanded, setExpanded } = useShowMore({
		lines,
		maxHeight,
	});
	const spring = reduced ? INSTANT : EXPAND;

	return (
		<div className={className}>
			<motion.div
				ref={contentRef}
				initial={false}
				animate={{ height: expanded ? "auto" : `${lines * 1.5}em` }}
				transition={spring}
				style={{ overflow: "hidden" }}
				aria-label={label}
			>
				{children}
			</motion.div>
			<button
				type="button"
				onClick={() => setExpanded((e) => !e)}
				className="mt-1 text-[13px] font-medium text-[#4568FF] hover:underline"
			>
				{expanded ? lessLabel : moreLabel}
			</button>
		</div>
	);
}
