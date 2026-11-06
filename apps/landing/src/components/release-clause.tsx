import { Download, MessageSquare, XCircle } from "lucide-react";

/**
 * Release clause — the escape hatch as three terms of one contract,
 * ruled rows instead of a card grid.
 */

const TERMS = [
	{
		icon: XCircle,
		title: "1‑click cancel",
		body: "No retention specialist. No phone call. Just click.",
	},
	{
		icon: Download,
		title: "Export your data",
		body: "CSV, JSON – your data belongs to you.",
	},
	{
		icon: MessageSquare,
		title: "Human support",
		body: "24h SLA. No bots. Real engineers.",
	},
];

export function ReleaseClause() {
	return (
		<div className="mt-10 border-t border-hairline-strong">
			{TERMS.map((term) => (
				<div
					key={term.title}
					className="grid grid-cols-[2.5rem_1fr] items-start gap-x-4 border-b border-hairline py-6 sm:grid-cols-[3rem_14rem_1fr] sm:items-baseline"
				>
					<term.icon
						className="mt-1 h-5 w-5 text-ink-soft sm:mt-0"
						strokeWidth={1.5}
						aria-hidden="true"
					/>
					<h3 className="display text-lg font-semibold tracking-tight text-ink-strong">
						{term.title}
					</h3>
					<p className="col-start-2 mt-1 max-w-[52ch] leading-relaxed text-ink-soft sm:col-start-3 sm:mt-0">
						{term.body}
					</p>
				</div>
			))}
		</div>
	);
}
