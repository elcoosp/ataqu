// packages/ui/src/components/interior/lightbox.tsx
// interior.dev Gesture — Lightbox (copied per interior.dev license). Single dep: motion.

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

const ZOOM = {
	type: "spring",
	stiffness: 260,
	damping: 30,
	mass: 0.6,
} as const;
const INSTANT = { duration: 0 } as const;

export type UseLightboxOptions = {
	open: boolean;
	src: string;
	alt: string;
	originRef?: React.RefObject<HTMLElement>;
	onClose: () => void;
};

export function useLightbox({ open, onClose }: UseLightboxOptions) {
	const frameRef = useRef<HTMLDivElement | null>(null);
	const contentRef = useRef<HTMLImageElement | null>(null);
	const [scale, setScale] = useState(1);
	const [x, setX] = useState(0);
	const [y, setY] = useState(0);

	const reset = () => {
		setScale(1);
		setX(0);
		setY(0);
	};

	const zoomAt = (clientX: number, clientY: number) => {
		const rect = contentRef.current?.getBoundingClientRect();
		if (!rect) return;
		const next = scale > 1 ? 1 : 2;
		setScale(next);
		if (next === 1) {
			setX(0);
			setY(0);
		} else {
			setX((clientX - (rect.left + rect.width / 2)) * -0.25);
			setY((clientY - (rect.top + rect.height / 2)) * -0.25);
		}
	};

	useEffect(() => {
		if (!open) reset();
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		if (open) window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open]);

	return {
		frameRef,
		contentRef,
		scale,
		x,
		y,
		zoomAt,
		reset,
		zoomed: scale > 1,
	};
}

export type LightboxProps = UseLightboxOptions & {
	caption?: string;
	maxScale?: number;
	className?: string;
};

export function Lightbox({
	open,
	src,
	alt,
	originRef,
	onClose,
	caption,
	className = "",
}: LightboxProps) {
	const reduced = useReducedMotion();
	const { frameRef, contentRef, scale, x, y, zoomAt, zoomed } = useLightbox({
		open,
		src,
		alt,
		originRef,
		onClose,
	});
	const spring = reduced ? INSTANT : ZOOM;

	if (!open) return null;

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.18 }}
			className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 ${className}`}
			onClick={onClose}
			role="dialog"
			aria-modal="true"
			aria-label={alt}
		>
			<div
				ref={frameRef}
				className="relative max-h-[90vh] max-w-[90vw]"
				onClick={(e) => e.stopPropagation()}
			>
				<motion.img
					ref={contentRef}
					src={src}
					alt={alt}
					initial={false}
					animate={{ scale, x, y }}
					transition={spring}
					onClick={(e) => zoomAt(e.clientX, e.clientY)}
					className={`max-h-[90vh] max-w-[90vw] rounded-lg object-contain ${zoomed ? "cursor-zoom-out" : "cursor-zoom-in"}`}
					draggable={false}
				/>
				{caption && (
					<p className="mt-2 text-center text-sm text-white/80">{caption}</p>
				)}
				<button
					type="button"
					onClick={onClose}
					aria-label="Close"
					className="absolute -top-3 -right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white text-stone-800 shadow"
				>
					×
				</button>
			</div>
		</motion.div>
	);
}
