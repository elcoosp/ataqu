import type { Variants } from "motion";

export const checkmarkDraw: Variants = {
	hidden: { pathLength: 0, opacity: 0 },
	visible: {
		pathLength: 1,
		opacity: 1,
		transition: { duration: 0.5, ease: "easeInOut" },
	},
};
