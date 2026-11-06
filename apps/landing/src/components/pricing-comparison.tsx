"use client";

import { Trans } from "@lingui/react/macro";

const ROWS = [
	{
		name: "HubSpot",
		price: "$1,200/mo",
		contract: "3‑year lock‑in",
		note: "Professional tier",
		highlight: false,
	},
	{
		name: "Slack",
		price: "$12.50/user/mo",
		contract: "Monthly",
		note: "30% price hike",
		highlight: false,
	},
	{
		name: "Zapier",
		price: "$79/mo",
		contract: "Monthly",
		note: "2,000 tasks/mo",
		highlight: false,
	},
	{
		name: "Ataqu",
		price: "$79/mo",
		contract: "Month‑to‑month",
		note: "10 apps included",
		highlight: true,
	},
];

export function PricingComparison() {
	return (
		<>
			{/* Mobile: ruled rows */}
			<div className="block border-t border-hairline-strong md:hidden">
				{ROWS.map((row) => (
					<div
						key={row.name}
						className={`flex items-baseline justify-between gap-4 border-b border-hairline py-4 ${
							row.highlight ? "bg-redline/5" : ""
						}`}
					>
						<div>
							<span
								className={`display text-base ${row.highlight ? "text-redline-ink" : "text-ink-strong"}`}
							>
								{row.name}
							</span>
							<div className="mt-1 text-sm text-ink-soft">
								<span>{row.contract}</span>
								<span className="mx-2">·</span>
								<span>{row.note}</span>
							</div>
						</div>
						<span
							className={`tnum font-mono text-base ${row.highlight ? "font-semibold text-redline-ink" : "text-ink"}`}
						>
							{row.price}
						</span>
					</div>
				))}
			</div>

			{/* Desktop: bill of materials */}
			<div className="hidden overflow-x-auto md:block">
				<table className="w-full border-collapse">
					<thead>
						<tr className="border-b border-hairline-strong">
							<th
								scope="col"
								className="meta px-4 py-3 text-left text-ink-soft"
							>
								<Trans>Tool</Trans>
							</th>
							<th
								scope="col"
								className="meta px-4 py-3 text-left text-ink-soft"
							>
								<Trans>Monthly cost</Trans>
							</th>
							<th
								scope="col"
								className="meta px-4 py-3 text-left text-ink-soft"
							>
								<Trans>Contract</Trans>
							</th>
							<th
								scope="col"
								className="meta px-4 py-3 text-left text-ink-soft"
							>
								<Trans>Notes</Trans>
							</th>
						</tr>
					</thead>
					<tbody>
						{ROWS.map((row) => (
							<tr
								key={row.name}
								className={`border-b border-hairline ${row.highlight ? "bg-redline/5" : ""}`}
							>
								<td
									className={`px-4 py-3.5 text-sm ${row.highlight ? "font-semibold text-redline-ink" : "text-ink"}`}
								>
									{row.name}
								</td>
								<td
									className={`tnum px-4 py-3.5 font-mono text-sm ${row.highlight ? "font-semibold text-redline-ink" : "text-ink"}`}
								>
									{row.price}
								</td>
								<td className="px-4 py-3.5 text-sm text-ink-soft">
									{row.contract}
								</td>
								<td className="px-4 py-3.5 text-sm text-ink-soft">
									{row.note}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</>
	);
}
