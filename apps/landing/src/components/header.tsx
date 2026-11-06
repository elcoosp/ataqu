"use client";

import { Dropdown, type ICommandItem, ICommandPalette } from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const COMPETITORS = [
	{ slug: "hubspot", label: "HubSpot" },
	{ slug: "slack", label: "Slack" },
	{ slug: "zapier", label: "Zapier" },
	{ slug: "notion", label: "Notion" },
	{ slug: "zoho-one", label: "Zoho One" },
	{ slug: "calendly", label: "Calendly" },
	{ slug: "typeform", label: "Typeform" },
	{ slug: "cin7", label: "Cin7" },
	{ slug: "personio", label: "Personio" },
	{ slug: "okta", label: "Okta" },
	{ slug: "tableau", label: "Tableau" },
];

const NAV = [
	{ href: "/pricing", label: <Trans>Pricing</Trans> },
	{ href: "/alternatives", label: <Trans>Alternatives</Trans> },
	{ href: "/about", label: <Trans>About</Trans> },
	{ href: "/blog", label: <Trans>Blog</Trans> },
	{ href: "/roadmap", label: <Trans>Roadmap</Trans> },
	{ href: "/faq", label: <Trans>FAQ</Trans> },
];

function RegistrationMark({ className }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			aria-hidden="true"
			className={className}
		>
			<circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
			<path d="M12 1v22M1 12h22" stroke="currentColor" strokeWidth="1.5" />
			<circle cx="12" cy="12" r="2.5" fill="currentColor" />
		</svg>
	);
}

export function Header() {
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
	const [paletteOpen, setPaletteOpen] = useState(false);
	const router = useRouter();

	const commandItems: ICommandItem[] = [
		{
			id: "home",
			label: "Home",
			hint: "Go to home",
			keywords: "start landing",
			shortcut: ["g", "h"],
		},
		{
			id: "pricing",
			label: "Pricing",
			hint: "View pricing",
			keywords: "cost plans",
			shortcut: ["g", "p"],
		},
		{
			id: "about",
			label: "About",
			hint: "About Ataqu",
			keywords: "company",
			shortcut: ["g", "a"],
		},
		{
			id: "blog",
			label: "Blog",
			hint: "Read the blog",
			keywords: "news articles",
			shortcut: ["g", "b"],
		},
		{
			id: "roadmap",
			label: "Roadmap",
			hint: "See the roadmap",
			keywords: "plans future",
			shortcut: ["g", "r"],
		},
		{
			id: "faq",
			label: "FAQ",
			hint: "Frequently asked questions",
			keywords: "help",
			shortcut: ["g", "f"],
		},
		...COMPETITORS.map((c) => ({
			id: `alt-${c.slug}`,
			label: `Alternatives: ${c.label}`,
			hint: `Compare with ${c.label}`,
			keywords: `alternative ${c.label.toLowerCase()}`,
		})),
	];

	const onCommandSelect = useCallback(
		(item: ICommandItem) => {
			if (item.id.startsWith("alt-")) {
				const slug = item.id.replace("alt-", "");
				router.push(`/alternatives/${slug}`);
			} else {
				router.push(`/${item.id === "home" ? "" : item.id}`);
			}
			setPaletteOpen(false);
		},
		[router],
	);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
				e.preventDefault();
				setPaletteOpen((o) => !o);
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);

	return (
		<header className="sticky top-0 z-50 border-b border-hairline-strong bg-paper/92 backdrop-blur-sm">
			<div className="container flex h-16 items-center justify-between">
				<Link
					href="/"
					className="flex items-center gap-2.5 text-ink-strong"
					aria-label="Ataqu home"
				>
					<RegistrationMark className="h-5 w-5 text-redline" />
					<span className="display text-lg font-semibold tracking-tight">
						ATAQU
					</span>
				</Link>

				<nav className="hidden items-center gap-6 text-sm md:flex">
					{NAV.map((item) => (
						<Link
							key={item.href}
							href={item.href}
							className="text-ink-soft transition-colors hover:text-ink"
						>
							{item.label}
						</Link>
					))}

					<div className="[&>button]:h-8 [&>button]:rounded-[2px] [&>button]:border-hairline-strong [&>button]:bg-paper [&>button]:px-2.5 [&>button]:text-[13px] [&>button]:text-ink [&>button]:shadow-none">
						<Dropdown
							label="Compare"
							placeholder="Compare"
							items={COMPETITORS.map((c) => ({
								value: c.slug,
								label: c.label,
							}))}
							onChange={(value) => router.push(`/alternatives/${value}`)}
						/>
					</div>

					<button
						type="button"
						onClick={() => setPaletteOpen(true)}
						className="meta flex items-center gap-1.5 rounded-[2px] border border-hairline-strong px-2 py-1 text-ink-soft transition-colors hover:border-ink hover:text-ink"
						aria-label="Open command palette"
					>
						<span>Search</span>
						<span className="opacity-60">⌘K</span>
					</button>

					<Link
						href="/#waitlist"
						className="btn btn-primary !px-4 !py-2 text-sm"
					>
						<Trans>Join the waitlist</Trans>
					</Link>
				</nav>

				<button
					className="p-2 text-ink-soft hover:text-ink md:hidden"
					onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
					aria-label="Toggle menu"
					aria-expanded={isMobileMenuOpen}
				>
					{isMobileMenuOpen ? (
						<X className="h-6 w-6" />
					) : (
						<Menu className="h-6 w-6" />
					)}
				</button>
			</div>

			{isMobileMenuOpen && (
				<div className="border-t border-hairline bg-paper md:hidden">
					<div className="container space-y-1 py-4">
						{NAV.map((item) => (
							<Link
								key={item.href}
								href={item.href}
								className="block py-2 text-ink transition-colors hover:text-redline-ink"
								onClick={() => setIsMobileMenuOpen(false)}
							>
								{item.label}
							</Link>
						))}
						<div className="mt-3 border-t border-hairline pt-3">
							<p className="meta mb-2 text-ink-soft">
								<Trans>Compare</Trans>
							</p>
							<div className="grid grid-cols-2 gap-x-4">
								{COMPETITORS.map((c) => (
									<Link
										key={c.slug}
										href={`/alternatives/${c.slug}`}
										className="block py-1.5 text-sm text-ink-soft transition-colors hover:text-ink"
										onClick={() => setIsMobileMenuOpen(false)}
									>
										{c.label}
									</Link>
								))}
							</div>
						</div>
						<div className="pt-4">
							<Link
								href="/#waitlist"
								className="btn btn-primary w-full"
								onClick={() => setIsMobileMenuOpen(false)}
							>
								<Trans>Join the waitlist</Trans>
							</Link>
						</div>
					</div>
				</div>
			)}

			<ICommandPalette
				open={paletteOpen}
				items={commandItems}
				onSelect={onCommandSelect}
				onDismiss={() => setPaletteOpen(false)}
				placeholder="Search Ataqu…"
			/>
		</header>
	);
}
