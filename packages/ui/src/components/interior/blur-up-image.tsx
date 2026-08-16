// packages/ui/src/components/interior/blur-up-image.tsx
// interior.dev Content — BlurUpImage (copied per interior.dev license). Single dep: motion.

import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";

const FADE = { duration: 0.4, ease: "easeOut" } as const;
const INSTANT = { duration: 0 } as const;

export type UseBlurUpImageOptions = {
	src: string;
	placeholder?: string;
	color?: string;
	blur?: number;
};

export function useBlurUpImage({
	src,
	placeholder,
	color = "#e5e5e5",
	blur = 14,
}: UseBlurUpImageOptions) {
	const [status, setStatus] = useState<"loading" | "loaded" | "error">(
		"loading",
	);
	return { status, setStatus, placeholder, color, blur };
}

export type BlurUpImageProps = UseBlurUpImageOptions & {
	alt: string;
	width: number;
	height: number;
	radius?: 5 | 6 | 9 | 11 | 14;
	loading?: "lazy" | "eager";
	className?: string;
};

export function BlurUpImage({
	src,
	alt,
	width,
	height,
	placeholder,
	color = "#e5e5e5",
	blur = 14,
	radius = 11,
	loading = "lazy",
	className = "",
}: BlurUpImageProps) {
	const reduced = useReducedMotion();
	const { status, setStatus } = useBlurUpImage({
		src,
		placeholder,
		color,
		blur,
	});
	const fade = reduced ? INSTANT : FADE;

	return (
		<div
			className={`relative overflow-hidden ${className}`}
			style={{ width, height, borderRadius: radius }}
		>
			{(placeholder || color) && (
				<motion.div
					initial={{ opacity: 1 }}
					animate={{ opacity: status === "loaded" ? 0 : 1 }}
					transition={fade}
					className="absolute inset-0"
					style={{
						backgroundColor: color,
						backgroundImage: placeholder ? `url(${placeholder})` : undefined,
						backgroundSize: "cover",
						filter: placeholder ? `blur(${blur}px)` : undefined,
					}}
				/>
			)}
			<motion.img
				src={src}
				alt={alt}
				width={width}
				height={height}
				loading={loading}
				onLoad={() => setStatus("loaded")}
				onError={() => setStatus("error")}
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={fade}
				className="absolute inset-0 h-full w-full object-cover"
				draggable={false}
			/>
		</div>
	);
}
