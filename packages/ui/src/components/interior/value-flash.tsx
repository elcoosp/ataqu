// packages/ui/src/components/interior/value-flash.tsx
// interior.dev Data — ValueFlash (copied per interior.dev license).
// Single runtime dependency: motion.

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

const HOLD = { duration: 0.9 } as const;
const INSTANT = { duration: 0 } as const;

export type UseValueFlashOptions = { value: number; hold?: number };

export function useValueFlash({ value, hold = 900 }: UseValueFlashOptions) {
	const [from, setFrom] = useState(value);
	const [direction, setDirection] = useState<"up" | "down" | "none">("none");
	const [changeId, setChangeId] = useState(0);
	const [flashing, setFlashing] = useState(false);
	const prev = useRef(value);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const alive = useRef(true);

	useEffect(() => {
		alive.current = true;
		return () => {
			alive.current = false;
			if (timer.current) clearTimeout(timer.current);
		};
	}, []);

	useEffect(() => {
		if (value === prev.current) return;
		setFrom(prev.current);
		setDirection(value > prev.current ? "up" : "down");
		setChangeId((c) => c + 1);
		setFlashing(true);
		prev.current = value;
		if (timer.current) clearTimeout(timer.current);
		timer.current = setTimeout(() => alive.current && setFlashing(false), hold);
	}, [value, hold]);

	return { direction, from, changeId, flashing };
}

export type ValueFlashProps = {
	value: number;
	format?: (value: number) => string;
	label?: string;
	hold?: number;
	className?: string;
};

export function ValueFlash({
	value,
	format = String,
	label,
	hold = 900,
	className = "",
}: ValueFlashProps) {
	const reduced = useReducedMotion();
	const { direction, from, changeId, flashing } = useValueFlash({
		value,
		hold,
	});
	const spring = reduced ? INSTANT : HOLD;

	return (
		<span
			className={`relative inline-flex items-center gap-1 ${className}`}
			aria-label={label}
		>
			<span>{format(value)}</span>
			{flashing && (
				<motion.span
					key={changeId}
					initial={{ opacity: 0.9, y: 0 }}
					animate={{ opacity: 0, y: direction === "up" ? -10 : 10 }}
					transition={spring}
					className={
						direction === "up"
							? "absolute text-emerald-500"
							: "absolute text-red-500"
					}
					aria-hidden
				>
					{format(from)}
				</motion.span>
			)}
		</span>
	);
}
