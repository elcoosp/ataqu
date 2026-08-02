"use client";

import Link from "next/link";
import { Trans } from "@lingui/react/macro";

export default function TermsPage() {
  return (
    <div className="container section-padding max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <Link href="/" className="text-primary hover:underline text-sm inline-block mb-6">
        <Trans>← Back to home</Trans>
      </Link>

      <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-8">
        <Trans>Terms of Service</Trans>
      </h1>

      <p className="text-sm text-muted-foreground mb-8">
        <Trans>Last Updated: August 29, 2026</Trans>
      </p>

      <div className="space-y-8">
        <section>
          <h2 className="font-display text-2xl font-bold text-primary mb-4">
            <Trans>1. The Agreement</Trans>
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            <Trans>By creating an Ataqu account, you agree to these Terms of Service ("ToS"). You ("Customer", "you", or "your") are entering into a binding agreement with Ataqu ("we", "us", or "Ataqu") to use our Unified SMB Operating System (the "Service").</Trans>
          </p>
          <p className="text-muted-foreground leading-relaxed mt-2">
            <Trans>If you are accepting these terms on behalf of a company, you represent that you have the authority to bind that entity.</Trans>
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-bold text-primary mb-4">
            <Trans>2. The Service & The Bundle</Trans>
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            <Trans>Ataqu provides a suite of 10 natively integrated business applications. You may purchase individual apps or the 10-app bundle.</Trans>
          </p>
          <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
            <li><Trans><strong>Pricing is Fixed:</strong> The price you agree to at checkout is the price you pay. We do not charge per-user fees. We do not charge per-task fees. We do not have hidden tiered pricing.</Trans></li>
            <li><Trans><strong>No Long-Term Contracts:</strong> All subscriptions are month-to-month unless explicitly stated otherwise. We do not use 3-year lock-in clauses.</Trans></li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl font-bold text-primary mb-4">
            <Trans>3. The Escape Hatch (Cancellation & Data Export)</Trans>
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            <Trans>We believe software must earn your business every month.</Trans>
          </p>
          <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
            <li><Trans><strong>1-Click Cancellation:</strong> You can cancel your subscription at any time directly within the Ataqu Admin settings. You do not need to call us, email us, or speak to a "retention specialist."</Trans></li>
            <li><Trans><strong>Data Export:</strong> Upon cancellation, you have the right to export all your data to standard CSV and JSON formats.</Trans></li>
            <li><Trans><strong>Data Deletion:</strong> Following cancellation, your workspace and all associated data will be permanently and cryptographically erased from our production PostgreSQL databases within 30 days. We do not retain your data to prevent you from returning.</Trans></li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl font-bold text-primary mb-4">
            <Trans>4. Acceptable Use Policy</Trans>
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            <Trans>You agree not to use the Service to:</Trans>
          </p>
          <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
            <li><Trans>Violate any local, national, or international law.</Trans></li>
            <li><Trans>Infringe upon the intellectual property rights of others.</Trans></li>
            <li><Trans>Upload malware, malicious code, or conduct unauthorized cyberattacks.</Trans></li>
            <li><Trans>Attempt to reverse engineer, decompile, or bypass the security measures of the Ataqu architecture (including our database-level tenant isolation via PostgreSQL Roles, RLS, and compile-time TenantId enforcement).</Trans></li>
            <li><Trans>Resell or white‑label the Service without explicit written permission.</Trans></li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl font-bold text-primary mb-4">
            <Trans>5. Intellectual Property</Trans>
          </h2>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li><Trans><strong>Ataqu IP:</strong> We own the Ataqu software, the Rust codebase, the UI design, and the "Ataqu" brand. You do not gain any ownership rights by using the Service.</Trans></li>
            <li><Trans><strong>Your IP:</strong> You retain all intellectual property rights to the data you input into Ataqu (deals, chats, docs, etc.). We are a data processor, not a data owner.</Trans></li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl font-bold text-primary mb-4">
            <Trans>6. Security & Architecture Transparency</Trans>
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            <Trans>We build in Rust with PostgreSQL, SeaORM 2.0, and raw SQL escape hatch for Postgres primitives. We enforce strict tenant isolation via PostgreSQL Roles, Row Level Security (RLS), Column-Level Privileges, and a type‑safe schema ENUM on the unified core.outbox table.</Trans>
          </p>
          <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
            <li><Trans><strong>No AI Training:</strong> We strictly forbid the use of Customer Data to train machine learning models, Large Language Models (LLMs), or artificial intelligence systems. Your data is never used for our internal research and development. PII is redacted at compile time via redacting newtypes (Email, PhoneNumber) with Debug/Display as [REDACTED]; JSON serialization is strictly restricted to the API layer via wrapper structs.</Trans></li>
            <li><Trans><strong>Status & RCAs:</strong> We maintain a public status page. In the event of a P0/P1 outage, we will publish a technical Root Cause Analysis (RCA) within 24 hours of resolution.</Trans></li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl font-bold text-primary mb-4">
            <Trans>7. Service Availability</Trans>
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            <Trans>We target 99.9% uptime. However, we do not offer SLA‑backed financial credits for standard plans, as the flat $49/mo pricing does not support enterprise SLA infrastructure costs. If we experience catastrophic downtime, we will communicate it transparently and apply service credits at our discretion.</Trans>
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-bold text-primary mb-4">
            <Trans>8. Limitation of Liability</Trans>
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            <Trans>To the maximum extent permitted by law:</Trans>
          </p>
          <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
            <li><Trans>Ataqu is provided "as is" and "as available."</Trans></li>
            <li><Trans>We are not liable for indirect, incidental, or consequential damages (e.g., lost profits, lost revenue, or business interruption).</Trans></li>
            <li><Trans>Our total liability for any claim arising from the Service is limited to the amount you paid us in the 3 months preceding the claim.</Trans></li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl font-bold text-primary mb-4">
            <Trans>9. Termination for Cause</Trans>
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            <Trans>We may suspend or terminate your account immediately if you violate the Acceptable Use Policy (Section 4) or if your usage threatens the operational stability of the PostgreSQL database architecture.</Trans>
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-bold text-primary mb-4">
            <Trans>10. Changes to These Terms</Trans>
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            <Trans>We may update these ToS. We will notify you 30 days before material changes take effect. If you disagree with the changes, your recourse is the 1‑Click Cancel button.</Trans>
          </p>
        </section>
      </div>
    </div>
  );
}
