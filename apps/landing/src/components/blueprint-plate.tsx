/**
 * The cyanotype plate — the architecture proof drawn as a real
 * schematic on Prussian blue: ten SPAs, one API, one outbox, one
 * database, with the LISTEN/NOTIFY loop marked.
 */

const STAGES = [
	{ x: 20, label: "10 SPAs", sub: "REACT 19 · TANSTACK" },
	{ x: 250, label: "RUST API", sub: "AXUM 0.8" },
	{ x: 480, label: "UNIFIED OUTBOX", sub: "EXACTLY-ONCE" },
	{ x: 710, label: "POSTGRESQL", sub: "18 · TEN SCHEMAS" },
] as const;

const BOX_W = 150;
const BOX_H = 64;
const BOX_Y = 56;

function stagePath(x: number) {
	return `M ${x} ${BOX_Y} h ${BOX_W} v ${BOX_H} h ${-BOX_W} Z`;
}

function flowPath(fromX: number) {
	const x1 = fromX + BOX_W;
	const x2 = fromX + 230;
	const midY = BOX_Y + BOX_H / 2;
	return `M ${x1 + 4} ${midY} h ${x2 - x1 - 14} m -6 -5 l 8 5 l -8 5`;
}

export function BlueprintPlate() {
	return (
		<div className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
			<div>
				<div className="overflow-x-auto">
					<svg
						viewBox="0 0 880 250"
						className="w-full min-w-[680px]"
						role="img"
						aria-label="Schematic: ten SPAs connect to a Rust API, which writes to a unified outbox, which lands in PostgreSQL; PostgreSQL notifies the apps back over LISTEN/NOTIFY."
					>
						{/* boxes */}
						{STAGES.map((s, i) => (
							<g key={s.label}>
								<path
									d={stagePath(s.x)}
									fill="none"
									stroke={
										i === 2
											? "var(--color-redline)"
											: "var(--color-blueprint-line)"
									}
									strokeWidth={i === 2 ? 1.75 : 1.25}
								/>
								<text
									x={s.x + BOX_W / 2}
									y={BOX_Y + 28}
									textAnchor="middle"
									fontSize="12"
									letterSpacing="0.1em"
									fill="var(--color-blueprint-line)"
									style={{ fontFamily: "var(--font-mono)" }}
								>
									{s.label}
								</text>
								<text
									x={s.x + BOX_W / 2}
									y={BOX_Y + 46}
									textAnchor="middle"
									fontSize="9"
									letterSpacing="0.08em"
									fill="var(--color-blueprint-soft)"
									style={{ fontFamily: "var(--font-mono)" }}
								>
									{s.sub}
								</text>
							</g>
						))}

						{/* connectors */}
						{STAGES.slice(0, 3).map((s) => (
							<path
								key={s.label}
								d={flowPath(s.x)}
								fill="none"
								stroke="var(--color-blueprint-line)"
								strokeWidth="1.25"
							/>
						))}

						{/* LISTEN/NOTIFY loop back */}
						<path
							d="M 785 120 v 60 h -675 v -60 m -6 8 l 6 -10 l 6 10"
							fill="none"
							stroke="var(--color-blueprint-soft)"
							strokeWidth="1.25"
							strokeDasharray="6 5"
						/>
						<text
							x={447}
							y={202}
							textAnchor="middle"
							fontSize="10"
							letterSpacing="0.12em"
							fill="var(--color-blueprint-soft)"
							style={{ fontFamily: "var(--font-mono)" }}
						>
							LISTEN / NOTIFY — EVENTS REACH EVERY APP INSTANTLY
						</text>
					</svg>
				</div>

				<div className="mt-10 flex flex-wrap items-center gap-4">
					<p className="max-w-md text-sm leading-relaxed text-blueprint-soft">
						One database, unified outbox, LISTEN/NOTIFY push — cross‑app events
						without a single webhook.
					</p>
				</div>
			</div>

			{/* General notes */}
			<div className="grid grid-cols-1 gap-px bg-blueprint-soft/30 sm:grid-cols-2">
				{[
					{
						title: "Bounded contexts",
						points: [
							"Schemas and roles enforce hard isolation",
							"Row Level Security blocks cross-domain spoofing",
							"Type-safe ENUM for domain boundaries",
						],
					},
					{
						title: "Exactly-once delivery",
						points: [
							"Advisory locks, negligible collision risk",
							"Durable response storage in PostgreSQL",
							"503 + Retry-After on conflict",
						],
					},
					{
						title: "Real-time outbox",
						points: [
							"LISTEN/NOTIFY for instant push",
							"Safety-net polling for missed notifications",
							"Dead letter queue after 5 retries",
						],
					},
					{
						title: "Resource efficiency",
						points: [
							"Bounded caches, pools, and channels",
							"Memory budget calculated and verified",
							"Runs on minimal infrastructure",
						],
					},
				].map((note) => (
					<div key={note.title} className="bg-blueprint p-5">
						<h3 className="display text-base font-semibold tracking-tight text-blueprint-line">
							{note.title}
						</h3>
						<ul className="mt-3 space-y-1.5 text-sm leading-relaxed text-blueprint-soft">
							{note.points.map((p) => (
								<li key={p} className="flex gap-2">
									<span
										aria-hidden="true"
										className="mt-[0.55em] h-px w-3 shrink-0 bg-blueprint-soft"
									/>
									{p}
								</li>
							))}
						</ul>
					</div>
				))}
			</div>
		</div>
	);
}
