# PRODUCT.md — Ataqu Website (Landing Page + Competitor Kill Sheets)

**Platform:** Web (Next.js, React, TypeScript, Tailwind CSS)  
**Domain:** `ataqu.so`  
**Version:** 2.0 (Phase 1)  
**Date:** 2026-08-02  

---

## 1. Product Purpose

Ataqu is a unified suite of 10 essential business applications (CRM, Chat, Automation, Docs, Scheduling, Forms, Inventory, HR, SSO, Analytics) built as a single Rust/PostgreSQL backend and delivered as independent SPAs.

The **website** serves two primary functions:

1. **Persuade** visitors to join the waitlist by proving the value proposition through mathematical pricing comparison and architectural credibility.
2. **Intercept** high‑intent search traffic from users actively looking to replace specific competitors (HubSpot, Slack, Zapier, Notion, Zoho, etc.) via dedicated **kill sheet** pages optimized for SEO.

The website is a microsite consisting of:

- A **homepage** (root `/`) that presents the unified OS vision, the app grid, the architecture proof, the escape hatch, and a prominent waitlist form.
- **Kill sheet pages** (`/alternatives/[competitor]`) that directly compare Ataqu to a specific competitor, show a 3‑year TCO breakdown, and provide a migration path.
- A **waitlist** flow (handled by the homepage form or a dedicated `/waitlist` page) that captures email and app preferences.

---

## 2. Primary User Personas

| Persona | Profile | What they need from the website |
|---------|---------|--------------------------------|
| **Alex – CEO / Founder** | 10–200 person SMB, frustrated by rising SaaS bills, locked into contracts. | Clear pricing math, 1‑click cancellation promise, reassurance that this isn’t a “toy.” |
| **Sam – CTO / Head of Ops** | Technical decision‑maker, cares about architecture, integration, and avoiding future tech debt. | Evidence of Rust/PostgreSQL robustness, native integration over brittle webhooks, PII security, and open architecture. |
| **Jordan – Head of Ops / Sales Ops** | Budget‑conscious, tired of vendor surprises. | Transparent pricing, no hidden fees, human support guarantee, and a clear migration plan. |

---

## 3. Website Structure & Pages

### 3.1 Homepage (`/`)
- **Hero:** “The Calm Predator of Productivity” – direct value prop, primary CTA (“Join the waitlist”).
- **The Math:** A summary comparison (HubSpot vs Slack vs Zapier vs Ataqu) with a “See full comparison” link to the detailed kill sheets. Ataqu’s pricing is shown as “$15/mo for 1 app, $39/mo for 5 apps, or $79/mo for all 10”.
- **The Apps:** Grid of 10 apps with icons and one‑line descriptions.
- **Architecture Proof:** Simplified diagram and bullet points of the Rust/PostgreSQL/outbox architecture.
- **The Escape Hatch:** 1‑click cancellation and data export promise, with a visual (screenshot mockup).
- **Waitlist Form:** Email, app selection, optional fields, submit.
- **Footer:** Links to kill sheets, about, blog, support, social.

### 3.2 Kill Sheet Pages (`/alternatives/[competitor]`)
One dedicated page per major competitor. Each page is a **self‑contained conversion asset** targeting a specific high‑intent search query.

| Competitor | Target URL | Primary Keyword |
|------------|------------|-----------------|
| HubSpot | `/alternatives/hubspot` | “hubspot alternative” |
| Slack | `/alternatives/slack` | “slack alternative” |
| Zapier | `/alternatives/zapier` | “zapier alternative” |
| Notion | `/alternatives/notion` | “notion alternative” |
| Zoho One | `/alternatives/zoho-one` | “zoho one alternative” |
| Calendly | `/alternatives/calendly` | “calendly alternative” |
| Typeform | `/alternatives/typeform` | “typeform alternative” |
| Cin7 | `/alternatives/cin7` | “cin7 alternative” |
| Personio | `/alternatives/personio` | “personio alternative” |
| Okta | `/alternatives/okta` | “okta alternative” |
| Tableau | `/alternatives/tableau` | “tableau alternative” |

#### Kill Sheet Page Template
Each page follows the same structure to ensure consistency and SEO strength:

1. **H1 / Title Tag:** `[Competitor] vs Ataqu: The $79/mo Alternative to [Competitor’s] Lock‑in` (or adjust to highlight starting price).
2. **Sub‑headline / Hook:** A direct attack on the competitor’s pricing, lock‑in, or architectural flaw (e.g., “HubSpot charges $1,200/mo for reporting. Ataqu includes it natively for $79/mo total – or start with one app for just $15/mo.”).
3. **3‑Year TCO Table:** A side‑by‑side comparison of the competitor’s pricing (including add‑ons) vs Ataqu’s tiered pricing. Highlight the savings with amber accent. The Ataqu row will show “$79/mo for all 10 apps (also $15/mo for 1)”.
4. **Why [Competitor] Fails:** 2–3 paragraphs explaining the specific pain points (price hikes, per‑user fees, brittle integrations, poor support, lock‑in) with real quotes or numbers from user reviews (anonymized).
5. **How Ataqu Solves It:** The architectural proof specific to that domain (e.g., for HubSpot: “CINQ is built on a unified PostgreSQL outbox – when a deal is won, DIAL and VAULT update instantly without Zapier”).
6. **Migration Path / Escape Hatch:** Step‑by‑step guide on how to export data from the competitor and import it into Ataqu, with a clear CTA to join the waitlist.
7. **Waitlist Form (inline):** Same as homepage, but positioned directly after the migration guide.
8. **Internal Links:** Links to the homepage, other kill sheets, and the engineering blog.

**SEO Meta Data:** Each page must have a unique `<title>` and `<meta description>` containing the target keyword and a clear value proposition.

---

## 4. SEO Strategy

### 4.1 Keyword Targeting
- **Primary:** “[Competitor] alternative” – high volume, high intent.
- **Secondary:** “how to cancel [competitor]”, “[competitor] pricing,” “[competitor] vs ataqu.”
- **Long‑tail:** “cheaper alternative to [competitor] for small business,” “replace [competitor] with unified suite.”

### 4.2 Technical SEO
- **Server‑side rendering** (Next.js) for fast LCP and search engine crawlability.
- **Static generation** for kill sheets (revalidate on content change).
- **Structured data:** `FAQPage` schema for the TCO table and common questions.
- **Internal linking:** Every kill sheet links to at least 3 other kill sheets and the homepage.
- **Sitemap:** Dynamically generated `sitemap.xml` containing all pages.

### 4.3 Content Strategy
- Each kill sheet is a **long‑form article** (800–1500 words) with H2/H3 headings, bullet lists, and a clear reading flow.
- Use **real competitor pricing data** (updated quarterly) to maintain credibility.
- Include **call‑out boxes** with key numbers (e.g., “HubSpot: $1,200/mo | Ataqu: $79/mo for 10 apps, or $15/mo for 1”).
- End with a **strong CTA** that leads to the waitlist.

---

## 5. Waitlist Flow

The waitlist form collects:
- **Email** (required)
- **Selected apps** (multi‑select from the 10)
- **Name** (optional)
- **Role** (optional)
- **Company size** (optional)
- **UTM parameters** (source, medium, campaign, term, content) – captured automatically on first visit and stored with the signup.

After submission:
- Show a **success confirmation** with a clear message (“You’re on the list! We’ll send you early access…”).
- Store data in the existing SQLite `waitlist` table via the `/api/waitlist` endpoint.
- (Future) Send a confirmation email via Postmark/SendGrid.

---

## 6. Visual Direction (All Pages)

**Concept:** “Dark Terminal / Command Center” – precise, confident, slightly aggressive.

| Element | Implementation |
|---------|----------------|
| **Background** | Deep Night Blue (`#0A1628`) – trust, seriousness, depth. |
| **Accent** | Amber (`#F59E0B`) – used for CTAs, key data points, and active states. |
| **Typography** | Unbounded for headings (bold, geometric), Inter for body (clean, highly readable). |
| **Borders & Elevation** | 1px crisp borders (`#1E2A3A`) instead of shadows for separation. Modals use sharp shadows. |
| **Imagery** | High‑contrast product UI screenshots, architectural diagrams, data tables – no stock photography. |
| **Motion** | Minimal: scroll‑reveals with `ease‑out`, no spinners (skeleton loaders where needed), 150ms micro‑interactions. |

---

## 7. Copy & Tone

- **Direct and aggressive toward incumbents** (e.g., “HubSpot’s 3‑year lock‑in is a trap.”)
- **Calm and confident about our own architecture** (e.g., “Built in Rust on PostgreSQL. Mathematically sound.”)
- **No fluff** – no “seamless,” “robust,” “empower,” “leverage.”
- **Transparent** – use exact numbers ($15, $39, $79, 1‑click, 24h SLA).
- **Human** – where appropriate, use “we” and “you” to build connection.

---

## 8. Accessibility & Performance

- **WCAG 2.2 AA** contrast ratios (body ≥4.5:1, large ≥3:1).
- **Keyboard navigable** with visible focus states.
- **Respect `prefers‑reduced‑motion`.**
- **LCP < 1.5s**, CLS < 0.1.
- **Bundle size** < 300 KB gzipped for the homepage.

---

## 9. Success Criteria

- **Waitlist conversion** > 15% on homepage, > 20% on kill sheets.
- **Organic traffic** to kill sheets grows to > 1000 visits/month within 3 months.
- **Bounce rate** < 40% on kill sheets (users are engaged by the content).
- **Time‑on‑page** > 2 minutes on kill sheets (reading the comparison).
- **Lighthouse score** > 95 on mobile and desktop.

---

## 10. Constraints & Open Decisions

- **Constraints:**
  - Must use Next.js, Tailwind, shadcn/ui.
  - Must work with existing `/api/waitlist` endpoint (extended to accept UTM fields).
  - No heavy client‑side JavaScript that hurts performance.
- **Open Decisions:**
  - Whether to include a blog section in the future (currently out of scope).
  - How to handle multi‑language support (we’ll keep English only for MVP).
