"use client";

import { useState } from "react";
import Link from "next/link";
import { Trans } from "@lingui/react/macro";
import { useLingui } from "@lingui/react";
import { t } from "@lingui/core/macro";
import { Menu, X } from "lucide-react";

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

  return (
    <header className="border-b border-border bg-background/90 backdrop-blur-sm sticky top-0 z-50">
      <div className="container flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-2 font-display text-xl font-bold text-foreground">
          <span className="text-primary">A</span>taqu
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm">
          <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <Trans>Home</Trans>
          </Link>
          <Link href="/alternatives" className="text-muted-foreground hover:text-foreground transition-colors">
            <Trans>Alternatives</Trans>
          </Link>
          <Link href="/roadmap" className="text-muted-foreground hover:text-foreground transition-colors">
            <Trans>Roadmap</Trans>
          </Link>
          <Link href="/blog" className="text-muted-foreground hover:text-foreground transition-colors">
            <Trans>Blog</Trans>
          </Link>
          <Link href="/about" className="text-muted-foreground hover:text-foreground transition-colors">
            <Trans>About</Trans>
          </Link>
          <div className="relative group">
            <button className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              <Trans>Alternatives</Trans>
              <span className="text-xs">▾</span>
            </button>
            <div className="absolute left-0 mt-2 w-48 rounded-lg border border-border bg-card shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <div className="p-2 space-y-1">
                {COMPETITORS.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/alternatives/${c.slug}`}
                    className="block px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-background/50 rounded-md transition-colors"
                  >
                    {c.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </nav>

        <button
          className="md:hidden p-2 text-muted-foreground hover:text-foreground"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label={useLingui().i18n._(t`Toggle menu`)}
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-sm">
          <div className="container py-4 space-y-3">
            <Link href="/" className="block text-muted-foreground hover:text-foreground transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
              <Trans>Home</Trans>
            </Link>
            <Link href="/alternatives" className="block text-muted-foreground hover:text-foreground transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
              <Trans>Alternatives</Trans>
            </Link>
            <Link href="/roadmap" className="block text-muted-foreground hover:text-foreground transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
              <Trans>Roadmap</Trans>
            </Link>
            <Link href="/blog" className="block text-muted-foreground hover:text-foreground transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
              <Trans>Blog</Trans>
            </Link>
            <Link href="/about" className="block text-muted-foreground hover:text-foreground transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
              <Trans>About</Trans>
            </Link>
            <div className="pt-2 border-t border-border/50">
              <p className="text-xs text-muted-foreground mb-2"><Trans>Alternatives</Trans></p>
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
    </header>
  );
}
