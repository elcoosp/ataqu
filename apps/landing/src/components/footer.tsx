"use client";

import { Trans } from "@lingui/react/macro";
import { Linkedin, Mail, Twitter } from "lucide-react";
import Link from "next/link";

const PRODUCT_LINKS = [
	{ href: "/pricing", label: <Trans>Pricing</Trans> },
	{ href: "/alternatives", label: <Trans>Alternatives</Trans> },
	{ href: "/roadmap", label: <Trans>Roadmap</Trans> },
	{ href: "/changelog", label: <Trans>Changelog</Trans> },
	{ href: "/faq", label: <Trans>FAQ</Trans> },
];

const COMPARE_LINKS = [
	{ slug: "hubspot", label: "vs HubSpot" },
	{ slug: "slack", label: "vs Slack" },
	{ slug: "notion", label: "vs Notion" },
	{ slug: "zapier", label: "vs Zapier" },
];

export function Footer() {
	return (
		<footer className="border-t border-hairline-strong bg-paper-sunken/60">
			<div className="container py-14">
				<div className="grid grid-cols-1 gap-10 md:grid-cols-12">
					<div className="md:col-span-5">
						<Link
							href="/"
							className="display text-lg font-semibold tracking-tight text-ink-strong"
						>
							ATAQU
						</Link>
						<p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-soft">
							<Trans>
								10 business apps on one Rust binary and one PostgreSQL database.
								$15–$79/mo, no lock‑in.
							</Trans>
						</p>
						<div className="mt-5 flex gap-4">
							<a
								href="https://twitter.com/ataqu"
								target="_blank"
								rel="noopener noreferrer"
								className="text-ink-soft transition-colors hover:text-ink"
								aria-label="Ataqu on Twitter"
							>
								<Twitter className="h-5 w-5" />
							</a>
							<a
								href="https://linkedin.com/company/ataqu"
								target="_blank"
								rel="noopener noreferrer"
								className="text-ink-soft transition-colors hover:text-ink"
								aria-label="Ataqu on LinkedIn"
							>
								<Linkedin className="h-5 w-5" />
							</a>
							<a
								href="mailto:support@ataqu.com"
								className="text-ink-soft transition-colors hover:text-ink"
								aria-label="Email Ataqu support"
							>
								<Mail className="h-5 w-5" />
							</a>
						</div>
					</div>

					<div className="md:col-span-2">
						<h4 className="meta text-ink-soft">
							<Trans>Product</Trans>
						</h4>
						<ul className="mt-3 space-y-2 text-sm">
							{PRODUCT_LINKS.map((l) => (
								<li key={l.href}>
									<Link
										href={l.href}
										className="text-ink-soft transition-colors hover:text-ink"
									>
										{l.label}
									</Link>
								</li>
							))}
						</ul>
					</div>

					<div className="md:col-span-3">
						<h4 className="meta text-ink-soft">
							<Trans>Redline revisions</Trans>
						</h4>
						<ul className="mt-3 grid grid-cols-2 gap-x-4 space-y-2 text-sm md:grid-cols-1">
							{COMPARE_LINKS.map((c) => (
								<li key={c.slug}>
									<Link
										href={`/alternatives/${c.slug}`}
										className="text-ink-soft transition-colors hover:text-ink"
									>
										{c.label}
									</Link>
								</li>
							))}
							<li>
								<Link href="/alternatives" className="link-redline">
									<Trans>All 11 comparisons</Trans>
								</Link>
							</li>
						</ul>
					</div>

					<div className="md:col-span-2">
						<h4 className="meta text-ink-soft">
							<Trans>Legal</Trans>
						</h4>
						<ul className="mt-3 space-y-2 text-sm">
							<li>
								<Link
									href="/terms"
									className="text-ink-soft transition-colors hover:text-ink"
								>
									<Trans>Terms of Service</Trans>
								</Link>
							</li>
							<li>
								<Link
									href="/privacy"
									className="text-ink-soft transition-colors hover:text-ink"
								>
									<Trans>Privacy Policy</Trans>
								</Link>
							</li>
						</ul>
					</div>
				</div>
			</div>

			{/* Title block — the drawing's signature close */}
			<div className="border-t border-hairline-strong">
				<div className="container py-0">
					<div className="grid grid-cols-2 gap-px overflow-hidden bg-hairline-strong md:grid-cols-5">
						{[
							{ k: <Trans>Project</Trans>, v: "ATAQU BUSINESS SYSTEMS" },
							{ k: <Trans>Sheet</Trans>, v: "WEB · 01" },
							{ k: <Trans>Scale</Trans>, v: "1:1" },
							{
								k: <Trans>Revision</Trans>,
								v: new Date().toISOString().slice(0, 7).replace("-", "."),
							},
							{ k: <Trans>Status</Trans>, v: <Trans>WAITLIST OPEN</Trans> },
						].map((cell, i) => (
							<div
								key={i}
								className="bg-paper px-4 py-3 md:border-r md:border-hairline-strong last:md:border-r-0"
							>
								<div className="meta text-ink-soft">{cell.k}</div>
								<div className="meta mt-1 text-ink-strong">{cell.v}</div>
							</div>
						))}
					</div>
				</div>
				<div className="container flex flex-col items-start justify-between gap-2 border-t border-hairline-strong py-4 text-xs text-ink-soft md:flex-row md:items-center">
					<p>
						<Trans>
							© {new Date().getFullYear()} Ataqu. All rights reserved.
						</Trans>
					</p>
					<p className="meta">
						<Trans>Tolerances: none. Cancel in one click.</Trans>
					</p>
				</div>
			</div>
		</footer>
	);
}
