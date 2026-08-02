"use client";

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
            10 apps, one price, zero lock‑in.
          </p>
        </div>

        <div>
          <h4 className="font-display text-sm font-semibold text-foreground">Product</h4>
          <ul className="mt-2 space-y-2 text-sm">
            <li><Link href="/alternatives" className="text-muted-foreground hover:text-foreground transition-colors">Alternatives</Link></li>
            <li><Link href="/roadmap" className="text-muted-foreground hover:text-foreground transition-colors">Roadmap</Link></li>
            <li><Link href="/blog" className="text-muted-foreground hover:text-foreground transition-colors">Blog</Link></li>
            <li><Link href="/about" className="text-muted-foreground hover:text-foreground transition-colors">About</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-display text-sm font-semibold text-foreground">Legal</h4>
          <ul className="mt-2 space-y-2 text-sm">
            <li><Link href="/terms" className="text-muted-foreground hover:text-foreground transition-colors">Terms of Service</Link></li>
            <li><Link href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-display text-sm font-semibold text-foreground">Connect</h4>
          <div className="mt-2 flex gap-4">
            <a href="https://github.com/ataqu" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
              <Github className="w-5 h-5" />
            </a>
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
            © {new Date().getFullYear()} Ataqu. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
