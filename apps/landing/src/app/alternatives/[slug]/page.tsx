import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { WaitlistForm } from "@/components/waitlist-form";
import { PricingComparison } from "@/components/pricing-comparison";

// Competitor data with raw English strings – will be translated at runtime using t macro
// We define a function that returns the data with t descriptors for each string.
// This ensures all strings are extracted by Lingui.
function getCompetitorData(slug: string) {
  const configs: Record<string, any> = {
    hubspot: {
      name: "HubSpot",
      tagline: t`HubSpot charges $1,200/mo for reporting. Ataqu includes it natively for $49/mo total.`,
      painPoints: [
        t`3‑year lock‑in contracts that auto‑renew at higher prices`,
        t`Hidden paywalls for reporting and automation`,
        t`Support is virtually nonexistent`,
        t`Integrations require Zapier (extra cost)`,
      ],
      ataquAdvantage: [
        t`CINQ gives you a full CRM, including reporting and automation, for a flat $49/mo`,
        t`Native integration with DIAL, VAULT, and SPARK via PostgreSQL outbox`,
        t`1‑click cancellation – no lock‑in`,
        t`Human support with 24h SLA`,
      ],
      migrationSteps: [
        t`Export your HubSpot contacts and deals to CSV`,
        t`Drop the CSV into Ataqu CINQ`,
        t`Your data is mapped instantly`,
        t`Cancel your HubSpot contract in 1 click`,
      ],
      price: "$1,200+/mo",
      contract: t`3‑year mandatory`,
    },
    slack: {
      name: "Slack",
      tagline: t`Slack taxes your team. DIAL gives you chat and support for one flat price.`,
      painPoints: [
        t`Per‑user pricing – grows with your team`,
        t`30% price hike in 2025 with no warning`,
        t`No native customer support – separate Intercom license needed`,
        t`Messages are siloed from your CRM`,
      ],
      ataquAdvantage: [
        t`DIAL unifies internal chat and customer support in one workspace`,
        t`Flat $49/mo for your whole team – no per‑user fees`,
        t`Native CRM integration – see deals and support tickets side‑by‑side`,
        t`1‑click cancel and full data export`,
      ],
      migrationSteps: [
        t`Export your Slack channel history (JSON)`,
        t`Import into DIAL – your channels and messages are preserved`,
        t`Connect DIAL to CINQ for native CRM integration`,
        t`Cancel Slack with 1 click`,
      ],
      price: "$15/user/mo",
      contract: t`Monthly`,
    },
    zapier: {
      name: "Zapier",
      tagline: t`Zapier is a brittle bridge. SPARK is the native foundation.`,
      painPoints: [
        t`Per‑task pricing – costs skyrocket as you scale`,
        t`Brittle webhooks that break when APIs change`,
        t`5‑15 minute polling delays`,
        t`No exactly‑once delivery – duplicates or drops data`,
      ],
      ataquAdvantage: [
        t`SPARK has unlimited tasks – no per‑task fees`,
        t`Native outbox with LISTEN/NOTIFY – <1s execution`,
        t`Exactly‑once delivery guaranteed by PostgreSQL advisory locks`,
        t`Works natively with all 10 Ataqu apps`,
      ],
      migrationSteps: [
        t`Open the SPARK visual builder`,
        t`Select your trigger (e.g., 'CINQ deal won')`,
        t`Choose your action (e.g., 'Create DIAL channel')`,
        t`Activate – no webhooks needed`,
      ],
      price: "$79/mo (750 tasks)",
      contract: t`Monthly`,
    },
    notion: {
      name: "Notion",
      tagline: t`Notion is a blank canvas graveyard. PIVOT is an operational database.`,
      painPoints: [
        t`2‑5 second search – lagging behind your work`,
        t`Data trapped in Notion's proprietary format`,
        t`No native CRM or inventory relations – requires Zapier`,
        t`Per‑user pricing adds up`,
      ],
      ataquAdvantage: [
        t`PIVOT uses PostgreSQL tsvector with GIN indexes – sub‑50ms search`,
        t`Native relations to CINQ deals and VAULT products`,
        t`1‑click export to CSV, JSON, and Markdown`,
        t`Flat $49/mo for the whole team`,
      ],
      migrationSteps: [
        t`Export your Notion pages as Markdown or CSV`,
        t`Drop the files into PIVOT`,
        t`Your data is indexed and searchable instantly`,
        t`Cancel Notion with 1 click`,
      ],
      price: "$18/user/mo",
      contract: t`Monthly`,
    },
    "zoho-one": {
      name: "Zoho One",
      tagline: t`Zoho One is bloatware disguised as a suite. Ataqu is 10 exceptional apps.`,
      painPoints: [
        t`45 apps – but most are outdated or useless`,
        t`Clunky 2012‑era UI`,
        t`Per‑user pricing – costs grow with your team`,
        t`Apps don't share a native database – integrations are slow`,
      ],
      ataquAdvantage: [
        t`10 focused, high‑quality apps built in Rust on PostgreSQL`,
        t`Native integration – data flows instantly between apps`,
        t`Flat $49/mo for your whole team – no per‑user fees`,
        t`Modern dark‑mode UI, built for 2026`,
      ],
      migrationSteps: [
        t`Export your Zoho CRM data to CSV`,
        t`Import into Ataqu CINQ`,
        t`Activate the other 9 apps natively`,
        t`Cancel Zoho One with 1 click`,
      ],
      price: "$37/user/mo",
      contract: t`Annual`,
    },
    calendly: {
      name: "Calendly",
      tagline: t`Calendly is a scheduling island. TEMPO is built into your OS.`,
      painPoints: [
        t`No native CRM integration – requires Zapier to update deals`,
        t`No‑show detection takes a day – too late to follow up`,
        t`Per‑user fees for a scheduling link`,
        t`Data is siloed – no activity tracking in CRM`,
      ],
      ataquAdvantage: [
        t`TEMPO creates CINQ activities and DIAL notifications automatically`,
        t`No‑show detection within 15‑30 minutes using PostgreSQL generated columns`,
        t`Flat $49/mo for your whole team`,
        t`OAuth refresh saga keeps calendars synced`,
      ],
      migrationSteps: [
        t`Export your Calendly event types (JSON)`,
        t`Import into TEMPO – your booking links are recreated`,
        t`Connect to CINQ and DIAL for native integration`,
        t`Cancel Calendly with 1 click`,
      ],
      price: "$15/user/mo",
      contract: t`Monthly`,
    },
    typeform: {
      name: "Typeform",
      tagline: t`Typeform charges for success. SOND gives you unlimited responses.`,
      painPoints: [
        t`10 free responses per month – a joke for any business`,
        t`Notifications email are a paid add‑on`,
        t`Branding removal requires a higher plan`,
        t`Data goes to a silo – needs Zapier for CRM`,
      ],
      ataquAdvantage: [
        t`SOND offers unlimited responses – no per‑response fees`,
        t`Native notifications and branding removal included`,
        t`Form submissions create CINQ leads and trigger SPARK workflows automatically`,
        t`Flat $49/mo for everything`,
      ],
      migrationSteps: [
        t`Export your Typeform responses (CSV)`,
        t`Recreate your forms in SOND (drag‑and‑drop builder)`,
        t`Connect to CINQ and SPARK natively`,
        t`Cancel Typeform with 1 click`,
      ],
      price: "$40/mo (plus add‑ons)",
      contract: t`Monthly`,
    },
    cin7: {
      name: "Cin7",
      tagline: t`Cin7 is a siloed warehouse. VAULT connects inventory to your CRM.`,
      painPoints: [
        t`No native CRM integration – orders and stock don't sync`,
        t`AI bloat that adds complexity without value`,
        t`Expensive per‑user pricing`,
        t`Slow to update stock levels in real time`,
      ],
      ataquAdvantage: [
        t`VAULT updates stock atomically with PostgreSQL CHECK constraints – no overselling`,
        t`CINQ deals automatically reserve stock via outbox events`,
        t`Flat $49/mo for your whole team`,
        t`Real‑time stock movements visible in VISTA dashboards`,
      ],
      migrationSteps: [
        t`Export your Cin7 products and stock levels (CSV)`,
        t`Import into VAULT`,
        t`Connect to CINQ for native order management`,
        t`Cancel Cin7 with 1 click`,
      ],
      price: "$79+/mo",
      contract: t`Annual`,
    },
    personio: {
      name: "Personio",
      tagline: t`Personio is a compliance silo. PAUSE connects HR to operations.`,
      painPoints: [
        t`No native integration with AEGIS – deprovisioning is manual`,
        t`Payroll complexity that SMBs don't need`,
        t`Expensive per‑user fees`,
        t`Support becomes unresponsive after contract signing`,
      ],
      ataquAdvantage: [
        t`PAUSE emits EmployeeCreatedV1 events – AEGIS automatically deprovisions on leave`,
        t`Leave requests trigger TEMPO calendar blocks and DIAL notifications`,
        t`Flat $49/mo for your whole team`,
        t`Human support with 24h SLA`,
      ],
      migrationSteps: [
        t`Export your Personio employee data (CSV)`,
        t`Import into PAUSE`,
        t`Connect to AEGIS and TEMPO for native security and scheduling`,
        t`Cancel Personio with 1 click`,
      ],
      price: "$8‑20/user/mo",
      contract: t`Annual`,
    },
    okta: {
      name: "Okta",
      tagline: t`Okta is a gatekeeper standing on top of your stack. AEGIS is the vault built into the foundation.`,
      painPoints: [
        t`Per‑user fees – $15/user/mo just for SSO`,
        t`SSO is a standalone product – no native integration with HR`,
        t`Complex admin UI that frustrates users`,
        t`Lock‑in – difficult to export identity data`,
      ],
      ataquAdvantage: [
        t`AEGIS is built into the OS – SSO is a feature, not a product`,
        t`Native integration with PAUSE – deprovision on leave automatically`,
        t`Flat $49/mo for the whole team – no per‑user SSO fees`,
        t`1‑click data export – your identity data belongs to you`,
      ],
      migrationSteps: [
        t`Export your Okta users and groups (CSV)`,
        t`Import into AEGIS`,
        t`Connect to PAUSE for automated provisioning/deprovisioning`,
        t`Cancel Okta with 1 click`,
      ],
      price: "$15/user/mo",
      contract: t`Annual`,
    },
    tableau: {
      name: "Tableau",
      tagline: t`Tableau is an ETL nightmare. VISTA is real‑time analytics, natively connected to your data.`,
      painPoints: [
        t`Requires data engineering – ETL pipelines are complex and fragile`,
        t`Expensive per‑user licensing – $70‑100/user/mo`,
        t`Slow dashboards – data is stale by the time it loads`,
        t`No native connection to CRM or inventory – requires middleware`,
      ],
      ataquAdvantage: [
        t`VISTA reads directly from the same PostgreSQL database as your apps – no ETL`,
        t`Real‑time updates via outbox with LISTEN/NOTIFY – dashboards are always fresh`,
        t`Flat $49/mo for your whole team – no per‑user BI fees`,
        t`Native connections to all 10 apps – revenue, inventory, support, and more`,
      ],
      migrationSteps: [
        t`Export your Tableau data sources (if any) – but with VISTA, you don't need ETL`,
        t`Connect VISTA to your Ataqu apps – dashboards are pre‑built`,
        t`Customize your dashboards with drag‑and‑drop`,
        t`Cancel Tableau with 1 click`,
      ],
      price: "$70‑100/user/mo",
      contract: t`Annual`,
    },
  };
  return configs[slug];
}

type PageProps = {
  params: { slug: string };
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const slug = params.slug;
  const data = getCompetitorData(slug);
  if (!data) return { title: "Not Found" };
  return {
    title: `${data.name} vs Ataqu: The $49/mo Alternative to ${data.name} Lock‑in`,
    description: `Replace ${data.name} with Ataqu's unified SMB OS. Flat $49/mo, 1‑click cancel, native integrations.`,
  };
}

export default function KillSheetPage({ params }: PageProps) {
  const { i18n } = useLingui();
  const slug = params.slug;
  const data = getCompetitorData(slug);
  if (!data) notFound();

  // Translate all fields using i18n._(descriptor)
  const name = i18n._(data.name);
  const tagline = i18n._(data.tagline);
  const painPoints = data.painPoints.map((p: any) => i18n._(p));
  const ataquAdvantage = data.ataquAdvantage.map((a: any) => i18n._(a));
  const migrationSteps = data.migrationSteps.map((s: any) => i18n._(s));
  const contract = i18n._(data.contract);

  return (
    <main className="container section-padding space-y-12 md:space-y-16">
      <div className="max-w-4xl mx-auto">
        <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">
          {name} vs Ataqu: The $49/mo Alternative to {name} Lock‑in
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">{tagline}</p>

        {/* 3‑Year TCO Table */}
        <div className="mt-8">
          <h2 className="font-display text-2xl font-bold">
            <Trans>3‑year Total Cost of Ownership</Trans>
          </h2>
          <div className="mt-4">
            <PricingComparison />
          </div>
        </div>

        {/* Why [Competitor] Fails */}
        <section className="mt-12">
          <h2 className="font-display text-2xl font-bold">
            <Trans>Why {name} Fails</Trans>
          </h2>
          <ul className="mt-4 space-y-3 list-disc list-inside text-muted-foreground">
            {painPoints.map((p: string, i: number) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </section>

        {/* How Ataqu Solves It */}
        <section className="mt-12">
          <h2 className="font-display text-2xl font-bold">
            <Trans>How Ataqu Solves It</Trans>
          </h2>
          <ul className="mt-4 space-y-3 list-disc list-inside text-muted-foreground">
            {ataquAdvantage.map((a: string, i: number) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </section>

        {/* Migration Path */}
        <section className="mt-12 p-6 rounded-lg border border-primary/30 bg-card/50">
          <h2 className="font-display text-2xl font-bold text-primary">
            <Trans>Your Escape Hatch</Trans>
          </h2>
          <p className="mt-2 text-muted-foreground">
            <Trans>Migrating from {name} is 1 click away.</Trans>
          </p>
          <ol className="mt-4 space-y-2 list-decimal list-inside text-muted-foreground">
            {migrationSteps.map((step: string, i: number) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
          <div className="mt-6">
            <a
              href="#waitlist"
              className="inline-block rounded-md bg-primary px-8 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Trans>Join the waitlist</Trans>
            </a>
          </div>
        </section>

        {/* Waitlist Form */}
        <section id="waitlist" className="mt-12">
          <h2 className="font-display text-2xl font-bold text-center">
            <Trans>Join the waitlist</Trans>
          </h2>
          <p className="mt-2 text-center text-muted-foreground">
            <Trans>Be first to access the suite. No credit card required.</Trans>
          </p>
          <div className="mt-6">
            <WaitlistForm />
          </div>
        </section>
      </div>
    </main>
  );
}
