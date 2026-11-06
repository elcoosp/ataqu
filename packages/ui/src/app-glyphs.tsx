import type React from "react";

/**
 * Shared app identity for the drawing-set chrome: sheet codes, names and
 * thin-line glyphs. One source of truth so the sidebar, ⌘K palette and
 * dashboard plates all render the same linework (no illustrated PNGs —
 * the drawing set speaks in strokes, not gloss).
 */
export const APP_NAMES: Record<string, string> = {
	aegis: "AEGIS",
	cinq: "CINQ",
	dial: "DIAL",
	pivot: "PIVOT",
	spark: "SPARK",
	tempo: "TEMPO",
	sond: "SOND",
	vault: "VAULT",
	pause: "PAUSE",
	vista: "VISTA",
};

/** Drawing-set sheet numbers: the sidebar's index of the set. */
export const APP_SHEET_NO: Record<string, string> = {
	aegis: "01",
	cinq: "02",
	dial: "03",
	pivot: "04",
	spark: "05",
	tempo: "06",
	sond: "07",
	vault: "08",
	pause: "09",
	vista: "10",
};

/** One-line description per app, in the meta voice of a drawing legend. */
export const APP_LEGEND: Record<string, string> = {
	aegis: "Control & administration",
	cinq: "Contacts & deals",
	dial: "Live support desk",
	pivot: "Documents & databases",
	spark: "Workflow automation",
	tempo: "Team scheduling",
	sond: "Forms & surveys",
	vault: "Inventory & stock",
	pause: "People & leave",
	vista: "Analytics & health",
};

const strokeProps = {
	fill: "none",
	stroke: "currentColor",
	strokeWidth: 1.5,
	strokeLinecap: "round" as const,
	strokeLinejoin: "round" as const,
};

const GLYPHS: Record<string, React.ReactNode> = {
	aegis: (
		<>
			<path d="M12 3l7 3v5c0 4.4-3 8.4-7 10-4-1.6-7-5.6-7-10V6l7-3z" />
			<path d="M9 11.5l2 2 4-4.5" />
		</>
	),
	cinq: (
		<>
			<circle cx="12" cy="8.5" r="3.5" />
			<path d="M5.5 20c.8-3.2 3.4-5 6.5-5s5.7 1.8 6.5 5" />
		</>
	),
	dial: (
		<path d="M5 4h4l1.5 4.5L8 10.5a12 12 0 0 0 5.5 5.5l2-2.5L20 15v4c0 .6-.4 1-1 1C10.7 20 4 13.3 4 5c0-.6.4-1 1-1z" />
	),
	pivot: (
		<>
			<path d="M6 3h8l4 4v14H6V3z" />
			<path d="M14 3v4h4" />
			<path d="M9 12h6M9 16h6" />
		</>
	),
	spark: <path d="M13 2L5 13.5h5.5L10 22l8-11.5h-5.5L13 2z" />,
	tempo: (
		<>
			<rect x="4" y="5" width="16" height="16" rx="1" />
			<path d="M4 9.5h16M8.5 3v4M15.5 3v4" />
			<path d="M8 13.5h3M8 17h3M13.5 13.5h3" />
		</>
	),
	sond: (
		<>
			<rect x="5" y="4" width="14" height="17" rx="1" />
			<path d="M9 2.5h6V6H9z" />
			<path d="M9 11l1.2 1.2L12.5 10M9 16l1.2 1.2L12.5 15M15 11.5h.5M15 16.5h.5" />
		</>
	),
	vault: (
		<>
			<path d="M4 8l8-4.5L20 8v8l-8 4.5L4 16V8z" />
			<path d="M4 8l8 4.5L20 8M12 12.5V20" />
		</>
	),
	pause: (
		<>
			<circle cx="9" cy="8" r="3.5" />
			<path d="M3.5 20c.7-3 3-4.8 5.5-4.8s4.8 1.8 5.5 4.8" />
			<path d="M16.5 4.5a3.5 3.5 0 0 1 0 7M17.5 15.5c1.7.7 2.7 2.2 3 4.5" />
		</>
	),
	vista: (
		<>
			<path d="M4 4v16h16" />
			<path d="M7.5 15.5l3.5-4 3 2.5 5-6" />
		</>
	),
};

/** Thin-line glyph for an app, sized via className (e.g. "h-4 w-4"). */
export function AppGlyph({
	app,
	className = "h-4 w-4",
}: {
	app: string;
	className?: string;
}) {
	const glyph = GLYPHS[app];
	if (!glyph) {
		return (
			<span className={className} aria-hidden="true">
				◇
			</span>
		);
	}
	return (
		<svg
			viewBox="0 0 24 24"
			className={className}
			aria-hidden="true"
			{...strokeProps}
		>
			{glyph}
		</svg>
	);
}

export const APP_KEYS = Object.keys(APP_NAMES);
