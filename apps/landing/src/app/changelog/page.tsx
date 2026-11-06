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
	New: "text-stamp border-stamp/50",
	Improved: "text-caution border-caution/50",
	Fixed: "text-ink-soft border-hairline-strong",
};

export default function ChangelogPage() {
	return (
		<div className="container section-padding">
			<div className="max-w-4xl">
				<h1 className="display text-4xl leading-tight text-ink-strong md:text-5xl">
					<Trans>Changelog & Stability Policy</Trans>
				</h1>
				<p className="mt-4 max-w-[62ch] text-lg leading-relaxed text-ink-soft">
					<Trans>
						What's shipped, what's changing, and our promise on stability and
						backwards compatibility.
					</Trans>
				</p>

				{/* Revision table */}
				<section className="mt-14">
					<h2 className="display border-b-2 border-ink-strong pb-3 text-xl text-ink-strong">
						<Trans>Recent changes</Trans>
					</h2>
					<ul>
						{CHANGELOG.map((entry, idx) => (
							<li key={idx} className="border-b border-hairline py-6">
								<div className="flex flex-wrap items-center gap-3">
									<span
										className={`meta rounded-[2px] border px-2 py-1 ${CATEGORY_STYLES[entry.category] ?? ""}`}
									>
										{entry.category}
									</span>
									<span className="meta text-ink-soft">
										v{entry.version} · {entry.date}
									</span>
									{entry.breaking && (
										<span className="meta rounded-[2px] border border-reject/50 px-2 py-1 text-reject">
											<Trans>Breaking</Trans>
										</span>
									)}
								</div>
								<p className="display mt-3 text-lg font-semibold tracking-tight text-ink-strong">
									{entry.title}
								</p>
								<p className="mt-1 max-w-[68ch] leading-relaxed text-ink-soft">
									{entry.description}
								</p>
							</li>
						))}
					</ul>
				</section>

				<section className="mt-14">
					<h2 className="display border-b-2 border-ink-strong pb-3 text-xl text-ink-strong">
						<Trans>Stability policy</Trans>
					</h2>
					<div className="mt-6 max-w-[68ch] space-y-4 leading-relaxed text-ink-soft">
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
								Breaking changes (removed fields, changed auth, schema
								migrations with downtime) follow semantic-versioned major
								releases with a minimum 90-day deprecation notice and a legacy
								compatibility toggle where feasible.
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
		</div>
	);
}
