import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { KillSheetContent } from "@/components/kill-sheet-content";

// Competitor data – kept here for server-side metadata generation
type CompetitorData = {
  name: string;
  tagline: string;
  painPoints: string[];
  ataquAdvantage: string[];
  migrationSteps: string[];
  price: string;
  contract: string;
};

const COMPETITORS: Record<string, CompetitorData> = {
  hubspot: {
    name: "HubSpot",
    tagline: "HubSpot charges $1,200/mo for reporting. Ataqu includes it natively for $49/mo total.",
    painPoints: [
      "3‑year lock‑in contracts that auto‑renew at higher prices",
      "Hidden paywalls for reporting and automation",
      "Support is virtually nonexistent",
      "Integrations require Zapier (extra cost)",
    ],
    ataquAdvantage: [
      "CINQ gives you a full CRM, including reporting and automation, for a flat $49/mo",
      "Native integration with DIAL, VAULT, and SPARK via PostgreSQL outbox",
      "1‑click cancellation – no lock‑in",
      "Human support with 24h SLA",
    ],
    migrationSteps: [
      "Export your HubSpot contacts and deals to CSV",
      "Drop the CSV into Ataqu CINQ",
      "Your data is mapped instantly",
      "Cancel your HubSpot contract in 1 click",
    ],
    price: "$1,200+/mo",
    contract: "3‑year mandatory",
  },
  slack: {
    name: "Slack",
    tagline: "Slack taxes your team. DIAL gives you chat and support for one flat price.",
    painPoints: [
      "Per‑user pricing – grows with your team",
      "30% price hike in 2025 with no warning",
      "No native customer support – separate Intercom license needed",
      "Messages are siloed from your CRM",
    ],
    ataquAdvantage: [
      "DIAL unifies internal chat and customer support in one workspace",
      "Flat $49/mo for your whole team – no per‑user fees",
      "Native CRM integration – see deals and support tickets side‑by‑side",
      "1‑click cancel and full data export",
    ],
    migrationSteps: [
      "Export your Slack channel history (JSON)",
      "Import into DIAL – your channels and messages are preserved",
      "Connect DIAL to CINQ for native CRM integration",
      "Cancel Slack with 1 click",
    ],
    price: "$15/user/mo",
    contract: "Monthly",
  },
  zapier: {
    name: "Zapier",
    tagline: "Zapier is a brittle bridge. SPARK is the native foundation.",
    painPoints: [
      "Per‑task pricing – costs skyrocket as you scale",
      "Brittle webhooks that break when APIs change",
      "5‑15 minute polling delays",
      "No exactly‑once delivery – duplicates or drops data",
    ],
    ataquAdvantage: [
      "SPARK has unlimited tasks – no per‑task fees",
      "Native outbox with LISTEN/NOTIFY – <1s execution",
      "Exactly‑once delivery guaranteed by PostgreSQL advisory locks",
      "Works natively with all 10 Ataqu apps",
    ],
    migrationSteps: [
      "Open the SPARK visual builder",
      "Select your trigger (e.g., 'CINQ deal won')",
      "Choose your action (e.g., 'Create DIAL channel')",
      "Activate – no webhooks needed",
    ],
    price: "$79/mo (750 tasks)",
    contract: "Monthly",
  },
  notion: {
    name: "Notion",
    tagline: "Notion is a blank canvas graveyard. PIVOT is an operational database.",
    painPoints: [
      "2‑5 second search – lagging behind your work",
      "Data trapped in Notion's proprietary format",
      "No native CRM or inventory relations – requires Zapier",
      "Per‑user pricing adds up",
    ],
    ataquAdvantage: [
      "PIVOT uses PostgreSQL tsvector with GIN indexes – sub‑50ms search",
      "Native relations to CINQ deals and VAULT products",
      "1‑click export to CSV, JSON, and Markdown",
      "Flat $49/mo for the whole team",
    ],
    migrationSteps: [
      "Export your Notion pages as Markdown or CSV",
      "Drop the files into PIVOT",
      "Your data is indexed and searchable instantly",
      "Cancel Notion with 1 click",
    ],
    price: "$18/user/mo",
    contract: "Monthly",
  },
  "zoho-one": {
    name: "Zoho One",
    tagline: "Zoho One is bloatware disguised as a suite. Ataqu is 10 exceptional apps.",
    painPoints: [
      "45 apps – but most are outdated or useless",
      "Clunky 2012‑era UI",
      "Per‑user pricing – costs grow with your team",
      "Apps don't share a native database – integrations are slow",
    ],
    ataquAdvantage: [
      "10 focused, high‑quality apps built in Rust on PostgreSQL",
      "Native integration – data flows instantly between apps",
      "Flat $49/mo for your whole team – no per‑user fees",
      "Modern dark‑mode UI, built for 2026",
    ],
    migrationSteps: [
      "Export your Zoho CRM data to CSV",
      "Import into Ataqu CINQ",
      "Activate the other 9 apps natively",
      "Cancel Zoho One with 1 click",
    ],
    price: "$37/user/mo",
    contract: "Annual",
  },
  calendly: {
    name: "Calendly",
    tagline: "Calendly is a scheduling island. TEMPO is built into your OS.",
    painPoints: [
      "No native CRM integration – requires Zapier to update deals",
      "No‑show detection takes a day – too late to follow up",
      "Per‑user fees for a scheduling link",
      "Data is siloed – no activity tracking in CRM",
    ],
    ataquAdvantage: [
      "TEMPO creates CINQ activities and DIAL notifications automatically",
      "No‑show detection within 15‑30 minutes using PostgreSQL generated columns",
      "Flat $49/mo for your whole team",
      "OAuth refresh saga keeps calendars synced",
    ],
    migrationSteps: [
      "Export your Calendly event types (JSON)",
      "Import into TEMPO – your booking links are recreated",
      "Connect to CINQ and DIAL for native integration",
      "Cancel Calendly with 1 click",
    ],
    price: "$15/user/mo",
    contract: "Monthly",
  },
  typeform: {
    name: "Typeform",
    tagline: "Typeform charges for success. SOND gives you unlimited responses.",
    painPoints: [
      "10 free responses per month – a joke for any business",
      "Notifications email are a paid add‑on",
      "Branding removal requires a higher plan",
      "Data goes to a silo – needs Zapier for CRM",
    ],
    ataquAdvantage: [
      "SOND offers unlimited responses – no per‑response fees",
      "Native notifications and branding removal included",
      "Form submissions create CINQ leads and trigger SPARK workflows automatically",
      "Flat $49/mo for everything",
    ],
    migrationSteps: [
      "Export your Typeform responses (CSV)",
      "Recreate your forms in SOND (drag‑and‑drop builder)",
      "Connect to CINQ and SPARK natively",
      "Cancel Typeform with 1 click",
    ],
    price: "$40/mo (plus add‑ons)",
    contract: "Monthly",
  },
  cin7: {
    name: "Cin7",
    tagline: "Cin7 is a siloed warehouse. VAULT connects inventory to your CRM.",
    painPoints: [
      "No native CRM integration – orders and stock don't sync",
      "AI bloat that adds complexity without value",
      "Expensive per‑user pricing",
      "Slow to update stock levels in real time",
    ],
    ataquAdvantage: [
      "VAULT updates stock atomically with PostgreSQL CHECK constraints – no overselling",
      "CINQ deals automatically reserve stock via outbox events",
      "Flat $49/mo for your whole team",
      "Real‑time stock movements visible in VISTA dashboards",
    ],
    migrationSteps: [
      "Export your Cin7 products and stock levels (CSV)",
      "Import into VAULT",
      "Connect to CINQ for native order management",
      "Cancel Cin7 with 1 click",
    ],
    price: "$79+/mo",
    contract: "Annual",
  },
  personio: {
    name: "Personio",
    tagline: "Personio is a compliance silo. PAUSE connects HR to operations.",
    painPoints: [
      "No native integration with AEGIS – deprovisioning is manual",
      "Payroll complexity that SMBs don't need",
      "Expensive per‑user fees",
      "Support becomes unresponsive after contract signing",
    ],
    ataquAdvantage: [
      "PAUSE emits EmployeeCreatedV1 events – AEGIS automatically deprovisions on leave",
      "Leave requests trigger TEMPO calendar blocks and DIAL notifications",
      "Flat $49/mo for your whole team",
      "Human support with 24h SLA",
    ],
    migrationSteps: [
      "Export your Personio employee data (CSV)",
      "Import into PAUSE",
      "Connect to AEGIS and TEMPO for native security and scheduling",
      "Cancel Personio with 1 click",
    ],
    price: "$8‑20/user/mo",
    contract: "Annual",
  },
  okta: {
    name: "Okta",
    tagline: "Okta is a gatekeeper standing on top of your stack. AEGIS is the vault built into the foundation.",
    painPoints: [
      "Per‑user fees – $15/user/mo just for SSO",
      "SSO is a standalone product – no native integration with HR",
      "Complex admin UI that frustrates users",
      "Lock‑in – difficult to export identity data",
    ],
    ataquAdvantage: [
      "AEGIS is built into the OS – SSO is a feature, not a product",
      "Native integration with PAUSE – deprovision on leave automatically",
      "Flat $49/mo for the whole team – no per‑user SSO fees",
      "1‑click data export – your identity data belongs to you",
    ],
    migrationSteps: [
      "Export your Okta users and groups (CSV)",
      "Import into AEGIS",
      "Connect to PAUSE for automated provisioning/deprovisioning",
      "Cancel Okta with 1 click",
    ],
    price: "$15/user/mo",
    contract: "Annual",
  },
  tableau: {
    name: "Tableau",
    tagline: "Tableau is an ETL nightmare. VISTA is real‑time analytics, natively connected to your data.",
    painPoints: [
      "Requires data engineering – ETL pipelines are complex and fragile",
      "Expensive per‑user licensing – $70‑100/user/mo",
      "Slow dashboards – data is stale by the time it loads",
      "No native connection to CRM or inventory – requires middleware",
    ],
    ataquAdvantage: [
      "VISTA reads directly from the same PostgreSQL database as your apps – no ETL",
      "Real‑time updates via outbox with LISTEN/NOTIFY – dashboards are always fresh",
      "Flat $49/mo for your whole team – no per‑user BI fees",
      "Native connections to all 10 apps – revenue, inventory, support, and more",
    ],
    migrationSteps: [
      "Export your Tableau data sources (if any) – but with VISTA, you don't need ETL",
      "Connect VISTA to your Ataqu apps – dashboards are pre‑built",
      "Customize your dashboards with drag‑and‑drop",
      "Cancel Tableau with 1 click",
    ],
    price: "$70‑100/user/mo",
    contract: "Annual",
  },
};

type PageProps = {
  params: { slug: string };
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const slug = params.slug;
  const data = COMPETITORS[slug];
  if (!data) return { title: "Not Found" };
  return {
    title: `${data.name} vs Ataqu: The $49/mo Alternative to ${data.name} Lock‑in`,
    description: `Replace ${data.name} with Ataqu's unified SMB OS. Flat $49/mo, 1‑click cancel, native integrations.`,
  };
}

export default function KillSheetPage({ params }: PageProps) {
  const slug = params.slug;
  const data = COMPETITORS[slug];
  if (!data) notFound();

  return <KillSheetContent data={data} slug={slug} />;
}
