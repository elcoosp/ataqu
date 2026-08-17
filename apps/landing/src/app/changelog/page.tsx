"use client";

import { Trans } from "@lingui/react/macro";

const CHANGELOG = [
	{
		version: "1.0.0",
		date: "2026-08-16",
		title: "Welcome to Ataqu",
		description:
			"The unified SMB platform is live. All 10 apps are available under one subscription.",
		category: "New",
		breaking: false,
	},
	{
		version: "1.0.0",
		date: "2026-08-16",
		title: "Unified Search",
		description:
			"Press ⌘K anywhere to search contacts, deals, products, tickets and more in one place.",
		category: "New",
		breaking: false,
	},
	{
		version: "1.0.0",
		date: "2026-08-16",
		title: "System Health & observability",
		description:
			"Live health badge in the Shell plus a full VISTA health dashboard with outbox lag and DLQ depth.",
		category: "New",
		breaking: false,
	},
];

const CATEGORY_STYLES: Record<string, string> = {
	New: "bg-emerald-500/15 text-emerald-400",
	Improved: "bg-amber-500/15 text-amber-400",
	Fixed: "bg-sky-500/15 text-sky-400",
};

export default function ChangelogPage() {
	return (
		<div className="container section-padding">
			<h1 className="font-display text-4xl md:text-5xl font-bold text-center">
				<Trans>Changelog & Stability Policy</Trans>
			</h1>
			<p className="mt-4 text-center text-muted-foreground max-w-2xl mx-auto">
				<Trans>
					What's shipped, what's changing, and our promise on stability and
					backwards compatibility.
				</Trans>
			</p>

			<section className="mt-12 max-w-3xl mx-auto">
				<h2 className="font-display text-2xl font-bold text-foreground">
					<Trans>Recent changes</Trans>
				</h2>
				<ul className="mt-6 space-y-6">
					{CHANGELOG.map((entry, idx) => (
						<li
							key={idx}
							className="border-b border-border/50 pb-6 last:border-0"
						>
							<div className="flex items-center gap-2">
								<span
									className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${
										CATEGORY_STYLES[entry.category] ?? ""
									}`}
								>
									{entry.category}
								</span>
								<span className="text-xs text-muted-foreground">
									v{entry.version} · {entry.date}
								</span>
								{entry.breaking && (
									<span className="rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-medium uppercase text-red-400">
										<Trans>Breaking</Trans>
									</span>
								)}
							</div>
							<p className="mt-2 text-lg font-medium text-foreground">
								{entry.title}
							</p>
							<p className="text-sm text-muted-foreground">
								{entry.description}
							</p>
						</li>
					))}
				</ul>
			</section>

			<section className="mt-12 max-w-3xl mx-auto">
				<h2 className="font-display text-2xl font-bold text-foreground">
					<Trans>Stability policy</Trans>
				</h2>
				<div className="mt-4 space-y-4 text-sm text-muted-foreground">
					<p>
						<Trans>
							We target 99.9% monthly uptime across all 10 applications.
							Scheduled maintenance is announced at least 48 hours in advance
							and performed inside published windows.
						</Trans>
					</p>
					<p>
						<Trans>
							Non-breaking changes (new endpoints, added fields, performance
							improvements) ship continuously and require no action from you.
						</Trans>
					</p>
					<p>
						<Trans>
							Breaking changes (removed fields, changed auth, schema migrations
							with downtime) follow semantic-versioned major releases with a
							minimum 90-day deprecation notice and a legacy compatibility
							toggle where feasible.
						</Trans>
					</p>
					<p>
						<Trans>
							Every change is recorded here and in the in-app changelog bell,
							so your team always knows what changed.
						</Trans>
					</p>
				</div>
			</section>
		</div>
	);
}
