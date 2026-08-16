// packages/ui/src/components/interior/load-more.tsx
// interior.dev Async — LoadMore (copied per interior.dev license). Single dep: motion.

import { useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";

export type UseLoadMoreOptions = {
	onLoad: () => unknown;
	hasMore?: boolean;
	auto?: boolean;
	rootMargin?: string;
	maxAutoLoads?: number;
};

export function useLoadMore({
	onLoad,
	hasMore = true,
	auto = true,
	rootMargin = "600px 0px",
	maxAutoLoads = 3,
}: UseLoadMoreOptions) {
	const sentinelRef = useRef<HTMLDivElement | null>(null);
	const inView = useInView(sentinelRef, { once: false });
	const [status, setStatus] = useState<"idle" | "loading" | "error" | "end">(
		"idle",
	);
	const autoLoads = useRef(0);

	useEffect(() => {
		if (!auto || !inView || !hasMore || status === "loading") return;
		if (autoLoads.current >= maxAutoLoads) return;
		const run = async () => {
			setStatus("loading");
			try {
				const res = await onLoad();
				autoLoads.current += 1;
				setStatus(res === false || !hasMore ? "end" : "idle");
			} catch {
				setStatus("error");
			}
		};
		void run();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [inView, hasMore, auto]);

	const load = () => {
		if (status === "loading" || !hasMore) return;
		setStatus("loading");
		Promise.resolve()
			.then(() => onLoad())
			.then((res) => setStatus(res === false || !hasMore ? "end" : "idle"))
			.catch(() => setStatus("error"));
	};

	return { status, sentinelRef, load };
}

export type LoadMoreProps = UseLoadMoreOptions & {
	labels?: Partial<Record<"idle" | "loading" | "error" | "end", string>>;
	className?: string;
};

export function LoadMore({
	onLoad,
	hasMore = true,
	auto = true,
	rootMargin = "600px 0px",
	maxAutoLoads = 3,
	labels,
	className = "",
}: LoadMoreProps) {
	const { status, sentinelRef, load } = useLoadMore({
		onLoad,
		hasMore,
		auto,
		rootMargin,
		maxAutoLoads,
	});
	const l = {
		idle: "Load more",
		loading: "Loading…",
		error: "Error — retry",
		end: "No more",
		...labels,
	};

	return (
		<div className={className}>
			{sentinelRef && (
				<div ref={sentinelRef} aria-hidden className="h-px w-full" />
			)}
			<button
				type="button"
				onClick={load}
				disabled={status === "loading" || !hasMore}
				className="mx-auto block rounded-[9px] border border-stone-200 bg-white px-4 py-2 text-[13px] font-medium text-stone-700 disabled:opacity-50 dark:border-white/[0.12] dark:bg-[#252522] dark:text-stone-200"
			>
				{status === "loading"
					? l.loading
					: !hasMore
						? l.end
						: status === "error"
							? l.error
							: l.idle}
			</button>
		</div>
	);
}
