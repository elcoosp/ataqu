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
		<header className="border-b border-border bg-background/90 backdrop-blur-sm sticky top-0 z-50">
			<div className="container flex items-center justify-between h-16">
				<Link
					href="/"
					className="flex items-center gap-0 font-display text-xl font-bold text-foreground"
				>
					<span className="text-primary">A</span>taqu
				</Link>

				<nav className="hidden md:flex items-center gap-6 text-sm">
					<Link
						href="/"
						className="text-muted-foreground hover:text-foreground transition-colors"
					>
						<Trans>Home</Trans>
					</Link>

					<Link
						href="/pricing"
						className="text-muted-foreground hover:text-foreground transition-colors"
					>
						<Trans>Pricing</Trans>
					</Link>

					<Link
						href="/about"
						className="text-muted-foreground hover:text-foreground transition-colors"
					>
						<Trans>About</Trans>
					</Link>

					<Link
						href="/blog"
						className="text-muted-foreground hover:text-foreground transition-colors"
					>
						<Trans>Blog</Trans>
					</Link>

					<Link
						href="/roadmap"
						className="text-muted-foreground hover:text-foreground transition-colors"
					>
						<Trans>Roadmap</Trans>
					</Link>

					<Link
						href="/faq"
						className="text-muted-foreground hover:text-foreground transition-colors"
					>
						<Trans>FAQ</Trans>
					</Link>

					<Dropdown
						label="Alternatives"
						placeholder="Alternatives"
						items={COMPETITORS.map((c) => ({ value: c.slug, label: c.label }))}
						onChange={(value) => router.push(`/alternatives/${value}`)}
					/>

					<button
						type="button"
						onClick={() => setPaletteOpen(true)}
						className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 text-xs border border-border rounded px-2 py-1"
						aria-label="Open command palette"
					>
						<Trans>Search</Trans>
						<span className="text-[10px] opacity-60">⌘K</span>
					</button>
				</nav>

				<button
					className="md:hidden p-2 text-muted-foreground hover:text-foreground"
					onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
					aria-label="Toggle menu"
				>
					{isMobileMenuOpen ? (
						<X className="w-6 h-6" />
					) : (
						<Menu className="w-6 h-6" />
					)}
				</button>
			</div>

			{isMobileMenuOpen && (
				<div className="md:hidden border-t border-border bg-background/95 backdrop-blur-sm">
					<div className="container py-4 space-y-3">
						<Link
							href="/"
							className="block text-muted-foreground hover:text-foreground transition-colors"
							onClick={() => setIsMobileMenuOpen(false)}
						>
							<Trans>Home</Trans>
						</Link>

						<Link
							href="/pricing"
							className="block text-muted-foreground hover:text-foreground transition-colors"
							onClick={() => setIsMobileMenuOpen(false)}
						>
							<Trans>Pricing</Trans>
						</Link>

						<Link
							href="/about"
							className="block text-muted-foreground hover:text-foreground transition-colors"
							onClick={() => setIsMobileMenuOpen(false)}
						>
							<Trans>About</Trans>
						</Link>

						<Link
							href="/blog"
							className="block text-muted-foreground hover:text-foreground transition-colors"
							onClick={() => setIsMobileMenuOpen(false)}
						>
							<Trans>Blog</Trans>
						</Link>

						<Link
							href="/roadmap"
							className="block text-muted-foreground hover:text-foreground transition-colors"
							onClick={() => setIsMobileMenuOpen(false)}
						>
							<Trans>Roadmap</Trans>
						</Link>

						<Link
							href="/faq"
							className="block text-muted-foreground hover:text-foreground transition-colors"
							onClick={() => setIsMobileMenuOpen(false)}
						>
							<Trans>FAQ</Trans>
						</Link>

						<div className="pt-2 border-t border-border/50">
							<p className="text-xs text-muted-foreground mb-2">
								<Trans>Alternatives</Trans>
							</p>
							{COMPETITORS.map((c) => (
								<Link
									key={c.slug}
									href={`/alternatives/${c.slug}`}
									className="block text-sm text-muted-foreground hover:text-foreground py-1 transition-colors"
									onClick={() => setIsMobileMenuOpen(false)}
								>
									{c.label}
								</Link>
							))}
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
