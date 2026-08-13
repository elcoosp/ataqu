import type { Variants } from "motion";

export const fadeInUp: Variants = {
	hidden: { opacity: 0, y: 24 },
	visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

export const staggerContainer: Variants = {
	hidden: { opacity: 0 },
	visible: {
		opacity: 1,
		transition: {
			staggerChildren: 0.08,
			delayChildren: 0.1,
		},
	},
};

export const scaleOnTap: Variants = {
	tap: { scale: 0.97, transition: { duration: 0.1 } },
};

export const cardTilt: Variants = {
	rest: { rotateX: 0, rotateY: 0, scale: 1 },
	hover: {
		rotateX: -2,
		rotateY: 4,
		scale: 1.02,
		transition: { duration: 0.3, ease: "easeOut" },
	},
};

export const inputFocusGlow: Variants = {
	focus: {
		boxShadow: "0 0 0 2px #F59E0B, 0 0 0 4px rgba(245, 158, 11, 0.15)",
		transition: { duration: 0.15 },
	},
};

export const checkmarkDraw: Variants = {
	hidden: { pathLength: 0, opacity: 0 },
	visible: {
		pathLength: 1,
		opacity: 1,
		transition: { duration: 0.5, ease: "easeInOut" },
	},
};
