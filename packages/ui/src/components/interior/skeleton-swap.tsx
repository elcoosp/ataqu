// packages/ui/src/components/interior/skeleton-swap.tsx
// interior.dev Async — SkeletonSwap (copied per interior.dev license).
// Single runtime dependency: motion. Swaps a skeleton for content with no
// layout shift.

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

const INSTANT = { duration: 0 } as const;

export type SkeletonSwapProps = {
	ready: boolean;
	children: React.ReactNode;
	lines?: number;
	lineHeight?: number;
	barHeight?: number;
	reserve?: number;
	height?: number;
	delay?: number;
	minVisible?: number;
	label?: string;
	skeleton?: React.ReactNode;
	className?: string;
};

export function SkeletonSwap({
	ready,
	children,
	lines = 3,
	lineHeight = 21,
	barHeight = 9,
	reserve,
	height = reserve ?? lines * lineHeight,
	delay = 120,
	minVisible = 380,
	label = "Loading",
	skeleton,
	className = "",
}: SkeletonSwapProps) {
	const reduced = useReducedMotion();
	const [showSkeleton, setShowSkeleton] = useState(!ready);
	const mounted = useRef(ready);
	const lastShown = useRef<number>(Date.now());

	useEffect(() => {
		if (ready) {
			const elapsed = Date.now() - lastShown.current;
			const wait = Math.max(0, Math.min(delay, minVisible - elapsed));
			const t = setTimeout(() => {
				mounted.current = true;
				setShowSkeleton(false);
			}, wait);
			return () => clearTimeout(t);
		}
		lastShown.current = Date.now();
		setShowSkeleton(true);
	}, [ready, delay, minVisible]);

	const fade = reduced ? INSTANT : { duration: 0.18 };

	return (
		<div
			className={className}
			aria-busy={showSkeleton}
			style={{ minHeight: ready ? undefined : height }}
		>
			<motion.div
				initial={false}
				animate={{ opacity: showSkeleton ? 1 : 0 }}
				transition={fade}
				style={{ display: showSkeleton ? "block" : "none" }}
				aria-hidden={!showSkeleton}
			>
				{skeleton ?? (
					<div
						role="status"
						aria-label={label}
						style={{ display: "grid", gap: lineHeight - barHeight }}
					>
						{Array.from({ length: lines }).map((_, i) => (
							<div
								key={i}
								style={{
									height: barHeight,
									borderRadius: 6,
									background:
										"linear-gradient(90deg, rgba(120,113,108,0.18), rgba(120,113,108,0.32), rgba(120,113,108,0.18))",
								}}
							/>
						))}
					</div>
				)}
			</motion.div>
			<motion.div
				initial={false}
				animate={{ opacity: showSkeleton ? 0 : 1 }}
				transition={fade}
			>
				{ready ? children : null}
			</motion.div>
		</div>
	);
}

export function useSkeletonSwap(ready: boolean) {
	const [showSkeleton, setShowSkeleton] = useState(!ready);
	const [busy, setBusy] = useState(!ready);

	useEffect(() => {
		setShowSkeleton(!ready);
		setBusy(!ready);
	}, [ready]);

	return { showSkeleton, busy };
}
