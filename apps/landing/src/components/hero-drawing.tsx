/**
 * Sheet 01 — General Arrangement.
 * The ten apps, the one binary, the one database, drawn the way the
 * product is actually built. The strokes extend once on load; under
 * prefers-reduced-motion the drawing is simply there.
 */

const APPS = [
	"CINQ · CRM",
	"PIVOT · DOCS & DATABASES",
	"DIAL · CHAT & SUPPORT",
	"SPARK · AUTOMATION",
	"TEMPO · SCHEDULING",
	"SOND · FORMS & SURVEYS",
	"VAULT · INVENTORY",
	"PAUSE · HR & LEAVE",
	"AEGIS · SSO & SECURITY",
	"VISTA · ANALYTICS",
] as const;

const STACK_X = 150;
const STACK_W = 190;
const BLOCK_H = 28;
const BLOCK_GAP = 6;
const STACK_TOP = 40;
const STACK_BOTTOM =
	STACK_TOP + APPS.length * BLOCK_H + (APPS.length - 1) * BLOCK_GAP; // 374

function blockPath(i: number) {
	const y = STACK_TOP + i * (BLOCK_H + BLOCK_GAP);
	return `M ${STACK_X} ${y} h ${STACK_W} v ${BLOCK_H} h ${-STACK_W} Z`;
}

export function HeroDrawing() {
	return (
		<figure className="plate plate-grid p-4 sm:p-6">
			<svg
				viewBox="0 0 520 560"
				role="img"
				aria-labelledby="hero-drawing-title hero-drawing-desc"
				className="h-auto w-full"
			>
				<title id="hero-drawing-title">
					General arrangement of the Ataqu system
				</title>
				<desc id="hero-drawing-desc">
					A technical drawing of ten application modules stacked above one Rust
					binary and one PostgreSQL database, dimensioned: ten apps, one
					subscription, one binary, one database.
				</desc>

				{/* Ten app blocks */}
				{APPS.map((label, i) => {
					const y = STACK_TOP + i * (BLOCK_H + BLOCK_GAP);
					return (
						<g key={label}>
							<path
								d={blockPath(i)}
								fill="var(--color-paper-sunken)"
								stroke="var(--color-hairline-strong)"
								strokeWidth="1"
								pathLength={1}
								className={i < 5 ? "draw d1" : "draw d2"}
							/>
							<text
								x={STACK_X + 12}
								y={y + 18}
								fontSize="10"
								letterSpacing="0.08em"
								fill="var(--color-ink)"
								className={`draw-fill ${i < 5 ? "d3" : "d4"}`}
								style={{ fontFamily: "var(--font-mono)" }}
							>
								{label}
							</text>
						</g>
					);
				})}

				{/* Vertical dimension: 10 apps */}
				<line
					x1={STACK_X}
					y1={STACK_TOP}
					x2={104}
					y2={STACK_TOP}
					stroke="var(--color-hairline-strong)"
					strokeWidth="1"
					pathLength={1}
					className="draw d2"
				/>
				<line
					x1={STACK_X}
					y1={STACK_BOTTOM}
					x2={104}
					y2={STACK_BOTTOM}
					stroke="var(--color-hairline-strong)"
					strokeWidth="1"
					pathLength={1}
					className="draw d2"
				/>
				<line
					x1={112}
					y1={STACK_TOP}
					x2={112}
					y2={STACK_BOTTOM}
					stroke="var(--color-ink)"
					strokeWidth="1.25"
					pathLength={1}
					className="draw d3"
				/>
				<line
					x1={107}
					y1={STACK_TOP + 5}
					x2={117}
					y2={STACK_TOP - 5}
					stroke="var(--color-ink-strong)"
					strokeWidth="1.5"
					pathLength={1}
					className="draw d4"
				/>
				<line
					x1={107}
					y1={STACK_BOTTOM + 5}
					x2={117}
					y2={STACK_BOTTOM - 5}
					stroke="var(--color-ink-strong)"
					strokeWidth="1.5"
					pathLength={1}
					className="draw d4"
				/>
				<text
					transform={`rotate(-90 98 ${STACK_TOP + (STACK_BOTTOM - STACK_TOP) / 2})`}
					x={98}
					y={STACK_TOP + (STACK_BOTTOM - STACK_TOP) / 2}
					textAnchor="middle"
					fontSize="10"
					letterSpacing="0.1em"
					fill="var(--color-redline-ink)"
					className="draw-fill d5"
					style={{ fontFamily: "var(--font-mono)" }}
				>
					10 APPS · ONE SUBSCRIPTION
				</text>

				{/* The binary — the one red element */}
				<line
					x1={STACK_X + 20}
					y1={STACK_BOTTOM}
					x2={STACK_X + 20}
					y2={396}
					stroke="var(--color-hairline-strong)"
					strokeWidth="1"
					pathLength={1}
					className="draw d4"
				/>
				<line
					x1={STACK_X + STACK_W - 20}
					y1={STACK_BOTTOM}
					x2={STACK_X + STACK_W - 20}
					y2={396}
					stroke="var(--color-hairline-strong)"
					strokeWidth="1"
					pathLength={1}
					className="draw d4"
				/>
				<path
					d="M 130 396 h 230 v 40 h -230 Z"
					fill="var(--color-paper)"
					stroke="var(--color-redline)"
					strokeWidth="1.5"
					pathLength={1}
					className="draw d5"
				/>
				<text
					x={245}
					y={420}
					textAnchor="middle"
					fontSize="10"
					letterSpacing="0.1em"
					fill="var(--color-ink-strong)"
					className="draw-fill d6"
					style={{ fontFamily: "var(--font-mono)" }}
				>
					ATAQU BINARY · RUST / AXUM
				</text>

				{/* The database */}
				<line
					x1={170}
					y1={436}
					x2={170}
					y2={452}
					stroke="var(--color-hairline-strong)"
					strokeWidth="1"
					pathLength={1}
					className="draw d5"
				/>
				<line
					x1={320}
					y1={436}
					x2={320}
					y2={452}
					stroke="var(--color-hairline-strong)"
					strokeWidth="1"
					pathLength={1}
					className="draw d5"
				/>
				<path
					d="M 110 452 h 270 v 38 h -270 Z"
					fill="var(--color-paper)"
					stroke="var(--color-ink-strong)"
					strokeWidth="1.5"
					pathLength={1}
					className="draw d5"
				/>
				<text
					x={245}
					y={475}
					textAnchor="middle"
					fontSize="10"
					letterSpacing="0.1em"
					fill="var(--color-ink-strong)"
					className="draw-fill d6"
					style={{ fontFamily: "var(--font-mono)" }}
				>
					POSTGRESQL · ONE DATABASE
				</text>

				{/* Outbox annotation */}
				<path
					d="M 340 205 h 30 l 18 -22"
					fill="none"
					stroke="var(--color-ink)"
					strokeWidth="1"
					pathLength={1}
					className="draw d6"
				/>
				<text
					x={394}
					y={176}
					fontSize="10"
					letterSpacing="0.08em"
					fill="var(--color-ink-strong)"
					className="draw-fill d7"
					style={{ fontFamily: "var(--font-mono)" }}
				>
					UNIFIED OUTBOX
				</text>
				<text
					x={394}
					y={190}
					fontSize="9"
					letterSpacing="0.04em"
					fill="var(--color-ink-soft)"
					className="draw-fill d7"
					style={{ fontFamily: "var(--font-mono)" }}
				>
					EVENTS BETWEEN APPS.
				</text>
				<text
					x={394}
					y={203}
					fontSize="9"
					letterSpacing="0.04em"
					fill="var(--color-ink-soft)"
					className="draw-fill d7"
					style={{ fontFamily: "var(--font-mono)" }}
				>
					NO WEBHOOKS.
				</text>

				{/* Horizontal dimension: one binary, one database */}
				<line
					x1={110}
					y1={490}
					x2={110}
					y2={526}
					stroke="var(--color-hairline-strong)"
					strokeWidth="1"
					pathLength={1}
					className="draw d6"
				/>
				<line
					x1={380}
					y1={490}
					x2={380}
					y2={526}
					stroke="var(--color-hairline-strong)"
					strokeWidth="1"
					pathLength={1}
					className="draw d6"
				/>
				<line
					x1={110}
					y1={520}
					x2={380}
					y2={520}
					stroke="var(--color-ink)"
					strokeWidth="1.25"
					pathLength={1}
					className="draw d7"
				/>
				<line
					x1={105}
					y1={525}
					x2={115}
					y2={515}
					stroke="var(--color-ink-strong)"
					strokeWidth="1.5"
					pathLength={1}
					className="draw d8"
				/>
				<line
					x1={375}
					y1={525}
					x2={385}
					y2={515}
					stroke="var(--color-ink-strong)"
					strokeWidth="1.5"
					pathLength={1}
					className="draw d8"
				/>
				<text
					x={245}
					y={545}
					textAnchor="middle"
					fontSize="10"
					letterSpacing="0.1em"
					fill="var(--color-ink-soft)"
					className="draw-fill d8"
					style={{ fontFamily: "var(--font-mono)" }}
				>
					ONE BINARY · TEN SCHEMAS
				</text>
			</svg>

			<figcaption className="mt-4 flex items-center justify-between border-t border-hairline pt-3">
				<span className="meta text-ink-soft">
					SHEET 01 · GENERAL ARRANGEMENT
				</span>
				<span className="meta text-ink-soft">SCALE 1:1</span>
			</figcaption>
		</figure>
	);
}
