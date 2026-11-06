import type React from "react";

/**
 * Access sheet: every auth screen renders on drafting paper with a faint
 * grid, corner registration marks and a title-block strip — the same
 * sheet-of-a-drawing-set fiction as the landing.
 */
export const AuthLayout: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	return (
		<div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
			{/* Faint drafting grid behind the sheet */}
			<div
				aria-hidden="true"
				className="plate-grid pointer-events-none absolute inset-0 opacity-60"
			/>

			{/* Corner registration marks */}
			{[
				"left-4 top-4",
				"right-4 top-4",
				"bottom-12 left-4",
				"bottom-12 right-4",
			].map((pos) => (
				<svg
					key={pos}
					aria-hidden="true"
					viewBox="0 0 16 16"
					fill="none"
					className={`absolute ${pos} h-3.5 w-3.5 text-muted-foreground/50`}
				>
					<circle cx="8" cy="8" r="5" stroke="currentColor" strokeWidth="1" />
					<path
						d="M8 0.5V4M8 12V15.5M0.5 8H4M12 8H15.5"
						stroke="currentColor"
						strokeWidth="1"
					/>
				</svg>
			))}

			<div className="relative z-10 w-full max-w-md">{children}</div>

			{/* Title block strip */}
			<footer
				aria-hidden="true"
				className="absolute inset-x-0 bottom-0 z-10 border-t border-border bg-background"
			>
				<div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-3">
					<span className="meta text-muted-foreground">
						ATAQU · Construction document set
					</span>
					<span className="meta hidden text-muted-foreground sm:inline">
						Access · SHT A-00
					</span>
				</div>
			</footer>
		</div>
	);
};
