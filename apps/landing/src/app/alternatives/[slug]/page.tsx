import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { KillSheetContent } from "@/components/kill-sheet-content";

// Raw data for metadata only
const COMPETITOR_NAMES: Record<string, string> = {
  hubspot: "HubSpot",
  slack: "Slack",
  zapier: "Zapier",
  notion: "Notion",
  "zoho-one": "Zoho One",
  calendly: "Calendly",
  typeform: "Typeform",
  cin7: "Cin7",
  personio: "Personio",
  okta: "Okta",
  tableau: "Tableau",
};

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const name = COMPETITOR_NAMES[slug];
  if (!name) return { title: "Not Found" };
  return {
    title: `${name} vs Ataqu: The $79/mo Alternative to ${name} Lock‑in`,
    description: `Replace ${name} with Ataqu's unified SMB OS. From $15/mo (all 10 for $79), 1‑click cancel, native integrations.`,
  };
}

export default async function KillSheetPage({ params }: PageProps) {
  const { slug } = await params;
  if (!COMPETITOR_NAMES[slug]) notFound();
  return <KillSheetContent slug={slug} />;
}
