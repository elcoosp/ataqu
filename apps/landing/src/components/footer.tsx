"use client";

import { Trans } from "@lingui/react/macro";
import Link from "next/link";
import { Github, Twitter, Linkedin, Mail } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border bg-background/80 py-12">
      <div className="container grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <Link href="/" className="font-display text-xl font-bold text-foreground">
            <span className="text-primary">A</span>taqu
          </Link>
          <p className="mt-2 text-sm text-muted-foreground max-w-xs">
            <Trans>$15–$79/mo, no lock‑in.</Trans>
          </p>
        </div>

        <div>
          <h4 className="font-display text-sm font-semibold text-foreground"><Trans>Product</Trans></h4>
          <ul className="mt-2 space-y-2 text-sm">
            <li><Link href="/alternatives" className="text-muted-foreground hover:text-foreground transition-colors"><Trans>Alternatives</Trans></Link></li>
            <li><Link href="/pricing" className="text-muted-foreground hover:text-foreground transition-colors"><Trans>Pricing</Trans></Link></li>
            <li><Link href="/about" className="text-muted-foreground hover:text-foreground transition-colors"><Trans>About</Trans></Link></li>
            <li><Link href="/blog" className="text-muted-foreground hover:text-foreground transition-colors"><Trans>Blog</Trans></Link></li>
            <li><Link href="/roadmap" className="text-muted-foreground hover:text-foreground transition-colors"><Trans>Roadmap</Trans></Link></li>
            <li><Link href="/faq" className="text-muted-foreground hover:text-foreground transition-colors"><Trans>FAQ</Trans></Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-display text-sm font-semibold text-foreground"><Trans>Legal</Trans></h4>
          <ul className="mt-2 space-y-2 text-sm">
            <li><Link href="/terms" className="text-muted-foreground hover:text-foreground transition-colors"><Trans>Terms of Service</Trans></Link></li>
            <li><Link href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors"><Trans>Privacy Policy</Trans></Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-display text-sm font-semibold text-foreground"><Trans>Connect</Trans></h4>
          <div className="mt-2 flex gap-4">
            <a href="https://twitter.com/ataqu" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
              <Twitter className="w-5 h-5" />
            </a>
            <a href="https://linkedin.com/company/ataqu" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
              <Linkedin className="w-5 h-5" />
            </a>
            <a href="mailto:support@ataqu.so" className="text-muted-foreground hover:text-foreground transition-colors">
              <Mail className="w-5 h-5" />
            </a>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            <Trans>© {new Date().getFullYear()} Ataqu. All rights reserved.</Trans>
          </p>
        </div>
      </div>
    </footer>
  );
}
