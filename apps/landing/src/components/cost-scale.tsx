/**
 * Cost gauge — the fragmented stack measured against one line.
 * Values are the flat published figures already shown in the
 * comparison table; the bar makes the ratio legible at a glance.
 */

const LINES = [
	{
		name: "HubSpot",
		detail: "Professional tier",
		value: 1200,
		label: "$1,200/mo",
		ataqu: false,
	},
	{
		name: "Zapier",
		detail: "2,000 tasks/mo",
		value: 79,
		label: "$79/mo",
		ataqu: false,
	},
	{
		name: "Ataqu · all 10 apps",
		detail: "One subscription",
		value: 79,
		label: "$79/mo",
		ataqu: true,
	},
	{
		name: "Ataqu · one app",
		detail: "Start small",
		value: 15,
		label: "$15/mo",
		ataqu: true,
	},
];

const MAX = 1200;

export function CostScale() {
	return (
		<div
			className="mt-10 grid grid-cols-[1fr] gap-y-5"
			role="img"
			aria-label="Bar comparison of monthly cost: HubSpot $1,200, Zapier $79, Ataqu all ten apps $79, Ataqu single app $15"
		>
			{LINES.map((line) => (
				<div
					key={line.name}
					className="grid grid-cols-[minmax(7.5rem,11rem)_1fr] items-center gap-x-4 sm:gap-x-6"
				>
					<div className="text-right">
						<div
							className={`text-sm leading-tight ${line.ataqu ? "font-semibold text-redline-ink" : "text-ink"}`}
						>
							{line.name}
						</div>
						<div className="text-xs text-ink-soft">{line.detail}</div>
					</div>
					<div className="relative flex items-center gap-3">
						<div className="h-6 flex-1 border border-hairline-strong bg-paper-raised">
							<div
								className={`h-full border ${line.ataqu ? "border-redline-ink bg-redline" : "border-ink-strong bg-ink-strong"}`}
								style={{ width: `${Math.max((line.value / MAX) * 100, 1.4)}%` }}
							/>
						</div>
						<span
							className={`tnum w-24 shrink-0 font-mono text-sm ${line.ataqu ? "font-semibold text-redline-ink" : "text-ink"}`}
						>
							{line.label}
						</span>
					</div>
				</div>
			))}
			<div className="meta mt-2 text-right text-ink-soft">
				FLAT MONTHLY PRICE, AS PUBLISHED PER VENDOR
			</div>
		</div>
	);
}
