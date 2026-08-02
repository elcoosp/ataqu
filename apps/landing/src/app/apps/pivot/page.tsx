"use client";
import Image from "next/image";

import Link from "next/link";
import { WaitlistForm } from "@/components/waitlist-form";

export default function PivotPage() {
  return (
    <div className="container section-padding max-w-4xl mx-auto">
      <Link href="/" className="text-primary hover:underline text-sm inline-block mb-6">

        ← Back to home
      </Link>

      <h1 className="font-display text-4xl md:text-5xl font-bold">
        Notion is a blank canvas graveyard. PIVOT is an operational database.
      </h1>
      <p className="mt-4 text-lg text-muted-foreground">
        
          PIVOT combines docs, relational databases, and instant search. Your project data lives natively
          alongside your CRM and inventory. No per‑user fees. No trapped data.
        
      </p>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="p-6 rounded-lg border border-border bg-card/30">
          <h2 className="font-display text-xl font-bold text-primary">Features</h2>
          <ul className="mt-4 space-y-2 text-muted-foreground">
            <li>• Markdown docs (like Notion)</li>
            <li>• Relational databases (like Airtable)</li>
            <li>• Sub‑15ms search (PostgreSQL tsvector)</li>
            <li>• Native links to CINQ deals and VAULT products</li>
            <li>• Templates and version history</li>
            <li>• 1‑click export to CSV, JSON, Markdown</li>
          </ul>
        </div>

        <div className="p-6 rounded-lg border border-border bg-card/30">
          <h2 className="font-display text-xl font-bold text-primary">Why replace Notion?</h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 font-display text-muted-foreground">Notion</th>
                <th className="text-left py-2 font-display text-muted-foreground">PIVOT</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/50">
                <td className="py-2 text-muted-foreground">$18/user/mo</td>
                <td className="py-2 text-primary font-bold">$15/mo (whole team)</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 text-muted-foreground">Search: 2‑5 seconds</td>
                <td className="py-2 text-primary font-bold">Search: &lt;15ms</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 text-muted-foreground">No native CRM link</td>
                <td className="py-2 text-primary font-bold">Native relations to CINQ</td>
              </tr>
              <tr>
                <td className="py-2 text-muted-foreground">Data export is difficult</td>
                <td className="py-2 text-primary font-bold">1‑click export</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-12 p-6 rounded-lg border border-primary/30 bg-card/50">
        <h2 className="font-display text-2xl font-bold text-primary">
          Native integration across the OS
        </h2>
        <p className="mt-2 text-muted-foreground">
          
            PIVOT tasks can be application‑level linked to CINQ deals and VAULT products.
            When a deal closes, the associated PIVOT task auto‑updates. No Zapier required.
          
        </p>
      </div>

      <div className="mt-12">
        <h2 className="font-display text-2xl font-bold text-center">
          Ready to escape Notion?
        </h2>
        <p className="mt-2 text-center text-muted-foreground">
          Start with pivot for $15/mo (or get all 10 for $79/mo). No credit card required for the trial.
        </p>
        <div className="mt-6">
          <WaitlistForm />
        </div>
      </div>
    </div>
  );
}
