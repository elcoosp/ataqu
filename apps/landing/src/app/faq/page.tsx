"use client";

import { Trans } from "@lingui/react/macro";
import Link from "next/link";

export default function FAQPage() {
  const faqSections = [
    {
      title: <Trans>Pricing & Billing</Trans>,
      items: [
        { q: <Trans>How much does Ataqu cost?</Trans>, a: <Trans>$15/mo for 1 app, $39/mo for 5 apps, or $79/mo for all 10 apps. No per‑user fees, no hidden charges.</Trans> },
        { q: <Trans>Can I change plans at any time?</Trans>, a: <Trans>Yes. You can upgrade or downgrade in 1 click from your dashboard. Billing is prorated.</Trans> },
        { q: <Trans>Is there a long‑term contract?</Trans>, a: <Trans>No. All plans are month‑to‑month. You can cancel anytime with no penalty.</Trans> },
        { q: <Trans>What happens if I exceed my plan limits?</Trans>, a: <Trans>There are no usage limits. The price is fixed regardless of volume.</Trans> },
        { q: <Trans>Do you offer discounts for non‑profits or startups?</Trans>, a: <Trans>Yes. Contact us at hello@ataqu.com with your organization details.</Trans> },
      ]
    },
    {
      title: <Trans>Migration & Data</Trans>,
      items: [
        { q: <Trans>Can I import data from HubSpot / Slack / Notion?</Trans>, a: <Trans>Yes. Every Ataqu app has CSV/JSON import tools to migrate your data in minutes.</Trans> },
        { q: <Trans>Can I export my data if I leave Ataqu?</Trans>, a: <Trans>Yes. You can export all your data in CSV/JSON in 1 click from your dashboard.</Trans> },
        { q: <Trans>Is my data compatible with other tools?</Trans>, a: <Trans>Exports are in standard formats (CSV, JSON) for easy reuse.</Trans> },
        { q: <Trans>How long does an import take?</Trans>, a: <Trans>Imports are usually instant, even for files with thousands of rows.</Trans> },
        { q: <Trans>Can you help me migrate?</Trans>, a: <Trans>Yes. Our human support is available 24/7 to help you format files and run the migration.</Trans> },
      ]
    },
    {
      title: <Trans>Security & Privacy</Trans>,
      items: [
        { q: <Trans>Where is my data stored?</Trans>, a: <Trans>In Europe (Germany), on secure servers compliant with GDPR.</Trans> },
        { q: <Trans>Do you use my data to train AI?</Trans>, a: <Trans>No. Your data is never used to train machine learning or AI models.</Trans> },
        { q: <Trans>Is my data encrypted?</Trans>, a: <Trans>Yes. Data is encrypted at rest and in transit.</Trans> },
        { q: <Trans>Can I permanently delete my data?</Trans>, a: <Trans>Yes. Deletion is immediate and irreversible.</Trans> },
        { q: <Trans>Is Ataqu GDPR‑compliant?</Trans>, a: <Trans>Yes. We fully comply with GDPR requirements.</Trans> },
      ]
    },
    {
      title: <Trans>Technical & Performance</Trans>,
      items: [
        { q: <Trans>Is Ataqu reliable?</Trans>, a: <Trans>Yes. Our infrastructure is designed for 99.9% uptime.</Trans> },
        { q: <Trans>How fast are the apps?</Trans>, a: <Trans>Response times are &lt; 200ms, thanks to an optimized architecture.</Trans> },
        { q: <Trans>Are the apps integrated with each other?</Trans>, a: <Trans>Yes. All Ataqu apps are natively integrated — no Zapier or third‑party APIs required.</Trans> },
        { q: <Trans>Can I use Ataqu on mobile?</Trans>, a: <Trans>Yes. All apps are responsive and mobile‑friendly.</Trans> },
        { q: <Trans>Is Ataqu available offline?</Trans>, a: <Trans>Not currently. Data sync requires an internet connection.</Trans> },
      ]
    },
    {
      title: <Trans>Support & SLA</Trans>,
      items: [
        { q: <Trans>What is your support response time?</Trans>, a: <Trans>A human responds within 24 hours, 7 days a week.</Trans> },
        { q: <Trans>How do I contact support?</Trans>, a: <Trans>By email (support@ataqu.com) or via the in‑app chat.</Trans> },
        { q: <Trans>Do you offer phone support?</Trans>, a: <Trans>Not currently. But our email and chat support are responsive and human.</Trans> },
        { q: <Trans>Is there a formal SLA?</Trans>, a: <Trans>Yes. We guarantee 99.9% uptime.</Trans> },
        { q: <Trans>What should I do in an emergency?</Trans>, a: <Trans>Use the in‑app chat. We respond quickly to urgent issues.</Trans> },
      ]
    },
    {
      title: <Trans>Cancellation & Refund</Trans>,
      items: [
        { q: <Trans>How do I cancel my subscription?</Trans>, a: <Trans>In 1 click from your dashboard. No forms, no support required.</Trans> },
        { q: <Trans>Can I get a refund?</Trans>, a: <Trans>Yes. If you cancel before the month ends, the current month is prorated.</Trans> },
        { q: <Trans>What happens to my data after cancellation?</Trans>, a: <Trans>You can export it in 1 click before canceling. After 30 days, it is permanently deleted.</Trans> },
        { q: <Trans>Can I reactivate my account after cancellation?</Trans>, a: <Trans>Yes. Simply log in and reactivate your subscription.</Trans> },
        { q: <Trans>Are there any cancellation fees?</Trans>, a: <Trans>No. Cancellation is free.</Trans> },
      ]
    }
  ];

  return (
    <div className="container section-padding max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <Link href="/" className="text-primary hover:underline text-sm inline-block mb-6">
        <Trans>← Back to home</Trans>
      </Link>

      <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-12">
        <Trans>Frequently Asked Questions</Trans>
      </h1>

      {faqSections.map((section, idx) => (
        <div key={idx} className="mb-12">
          <h2 className="font-display text-2xl font-bold text-primary mb-6">
            {section.title}
          </h2>
          <div className="space-y-4">
            {section.items.map((item, qIdx) => (
              <div key={qIdx} className="border-b border-border pb-4">
                <div className="font-display text-base font-semibold text-foreground mb-1">
                  {item.q}
                </div>
                <div className="text-muted-foreground leading-relaxed">
                  {item.a}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="text-center text-sm text-muted-foreground mt-12">
        <Trans>Last updated: August 2026</Trans>
      </div>
    </div>
  );
}
