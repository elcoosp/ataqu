import { useVirtualizer, type VirtualItem } from "@tanstack/react-virtual";
import type React from "react";
import { useRef } from "react";
import { cn } from "../lib/utils";

export interface VirtualRowsArgs {
	/** Top padding row height (px) — render as an empty spacer `<tr>`. */
	padTop: number;
	/** Bottom padding row height (px) — render as an empty spacer `<tr>`. */
	padBottom: number;
	/**
	 * Visible window of items. When the scroll viewport cannot be measured
	 * (jsdom, first paint, `display: none`), this is a synthesized list of
	 * pseudo-items covering ALL indexes so callers render one code path.
	 */
	items: VirtualItem[];
	/**
	 * Attach to each rendered row (`ref={measureElement}` + `data-index`) to
	 * enable dynamic row-height measurement. A no-op when unwindowed.
	 */
	measureElement: (el: HTMLElement | null) => void;
}

interface VirtualRowsProps {
	/** Total row count. */
	count: number;
	/** Initial row-height estimate in px; rows are measured afterwards. */
	estimateSize?: number;
	/** Rows rendered above/below the viewport. */
	overscan?: number;
	/** Max scroll-viewport height in px. */
	maxHeight?: number;
	className?: string;
	/**
	 * Render prop for a real `<table>` body: render an empty spacer `<tr>` of
	 * `padTop`, then one `<tr>` per item (each with `data-index={item.index}`
	 * and `ref={measureElement}`), then a `padBottom` spacer. Spacer rows
	 * preserve native column alignment — no absolute positioning.
	 */
	children: (args: VirtualRowsArgs) => React.ReactNode;
}

/**
 * Windowed rows for real `<table>` markup (brainstorm P1-6 / P3-4).
 * Uses spacer rows instead of absolutely-positioned rows so native column
 * alignment, sticky headers, and row styling keep working. Degrades to a
 * plain (unwindowed) table whenever the viewport can't be measured.
 */
export function VirtualRows({
	count,
	estimateSize = 40,
	overscan = 8,
	maxHeight = 480,
	className,
	children,
}: VirtualRowsProps) {
	const parentRef = useRef<HTMLDivElement>(null);
	const virtualizer = useVirtualizer({
		count,
		getScrollElement: () => parentRef.current,
		estimateSize: () => estimateSize,
		overscan,
		getItemKey: (index) => index,
	});
	const items = virtualizer.getVirtualItems();

	let args: VirtualRowsArgs;
	if (items.length > 0) {
		const last = items[items.length - 1];
		args = {
			padTop: items[0].start,
			padBottom: Math.max(
				0,
				virtualizer.getTotalSize() - (last.start + last.size),
			),
			items,
			measureElement: virtualizer.measureElement,
		};
	} else {
		// Unmeasured viewport: render every row as pseudo-items (heights come
		// from content) with zero padding and no measurement refs.
		args = {
			padTop: 0,
			padBottom: 0,
			items: Array.from({ length: count }, (_, index) => ({
				index,
				start: index * estimateSize,
				size: estimateSize,
				key: index,
			})) as VirtualItem[],
			measureElement: () => {},
		};
	}

	return (
		<div
			ref={parentRef}
			className={cn("w-full overflow-auto", className)}
			style={{ maxHeight: `${maxHeight}px` }}
		>
			{children(args)}
		</div>
	);
}
