# 🥷 ATAQU SALES PLAYBOOK — Version 1.4 (Phase 1)
### The "Escape Hatch" Methodology for SaaS Decommissioning

> **Executive Note:** Ataqu is a Product-Led Growth (PLG) company. We do not run a traditional, high-friction enterprise sales motion. There are no 3‑month procurement cycles, no "Custom Enterprise Tiers," and no golf outings. At $49/month, our ACV (Annual Contract Value) does not justify a massive outbound sales floor. However, PLG does not mean "no sales." It means **Sales-Assisted Growth**. When a CTO or CEO is in the app, kicking the tires on CINQ or DIAL, our job is to help them decommission their legacy stack as fast as possible. We are not here to "pitch software." We are here to execute a rescue mission.

---

## 1. THE SALES PHILOSOPHY: THE CALM FACILITATOR

### 1.1 The Core Identity
In marketing, Ataqu is the "Outlaw." In sales, we are the **"Calm Facilitator."** We do not use high-pressure tactics, FUD (Fear, Uncertainty, Doubt), or artificial scarcity. We rely on radical transparency, mathematical pricing comparisons, and architectural proof.

### 1.2 The 3 Unbreakable Sales Rules
1. **No Discounting. Ever.** We are already at $49/mo. Offering a discount implies the price was inflated to begin with. The price is the price. If they ask for a discount, send them the Competitor Kill Sheet showing HubSpot’s $12k invoice.
2. **No "Contact Us" Walls.** If a prospect asks a pricing or feature question, answer it instantly in plain text. Do not gatekeep information to force a demo.
3. **Sell the Migration, Not the Features.** Buyers don't doubt that Ataqu has a CRM. They doubt that migrating from HubSpot to Ataqu is worth the headache. The sale is won by proving the migration is frictionless.

---

## 2. THE QUALIFICATION MATRIX (Adapted MEDDPICC)

Because our ACV is low, we cannot spend hours qualifying unqualified leads. We use a ruthless, adapted MEDDPICC framework tailored for SMB PLG.

| Criteria | The Ataqu Qualification Question |
|----------|----------------------------------|
| **Metrics** | Are they currently spending >$1,000/month on fragmented SaaS (HubSpot, Slack, Zapier)? |
| **Economic Buyer** | Is the user a CEO, CTO, or Head of Ops? (If it's an intern, do not spend time on a call). |
| **Decision Criteria** | Do they value fixed pricing and data sovereignty over "having every single niche feature"? |
| **Decision Process** | Can they cancel their current tools without a 3‑year legal penalty? |
| **Paper Process** | Do they have a credit card? (No procurement departments). |
| **Identify Pain** | Did a competitor just raise their price? Is Zapier breaking their workflows? |
| **Champion** | Is there a technical founder who appreciates Rust/PostgreSQL/SeaORM architecture? |
| **Competition** | Are they willing to tolerate their current vendor's lock‑in, or are they ready to leave? |

**Disqualification Rule:** If a company demands 20 hours of custom onboarding, dedicated SSL certificates, or a 50‑page MSA, they are not an SMB; they are an enterprise. Send them a polite "We are not a fit" email and point them to Zoho.

---

## 3. THE 3 CORE SALES PLAYS

Our playbook consists of three specific scenarios designed to intercept buyer intent and accelerate decommissioning.

### Play 1: The "HubSpot Hostage Rescue"
**Trigger:** A CEO or Ops Lead books a call because their HubSpot renewal is approaching, or they just got hit with a 6% price increase.
**The Approach:** Empathy + Math.
1. **Acknowledge the Pain:** "We know the pain of HubSpot's 3‑year lock‑ins. We built Ataqu specifically because we were sick of it."
2. **Show the Math:** Open the Ataqu TCO (Total Cost of Ownership) calculator. Compare their HubSpot quote to $49/month.
3. **The Kill Shot:** "We don't have a 3‑year contract. You can cancel in 1 click. If you hate it after a month, you lose $49. If you stay, you save $14,000 this year."
4. **Action:** Send them the HubSpot CSV import guide for CINQ. Mention that custom fields are stored in PostgreSQL JSONB with graceful degradation (`@>` exact match, `->>` ILIKE partial text, `jsonb_each_text` cross-field) for instant filtering.

### Play 2: The "Zapier Eradication" (CTO Pitch)
**Trigger:** A CTO or Head of Ops signs up for SPARK (Automation) after hitting Zapier task limits.
**The Approach:** Architectural Superiority.
1. **Acknowledge the Pain:** "Zapier is great until you scale. Then it becomes a fragile, expensive house of cards."
2. **Show the Architecture:** Briefly explain the unified outbox with `LISTEN/NOTIFY` and RLS. "Our apps don't talk via webhooks over the public internet. They share a native PostgreSQL event bus with `LISTEN/NOTIFY` and RLS – zero task limits, zero brittle APIs. Each domain role can only insert events for its own schema — hard database boundaries."
3. **The Kill Shot:** "Turn off your Zapier workflows. Rebuild them natively in SPARK. If an API changes, our unified architecture handles the state, so you don't lose data."
4. **Action:** Give them a Loom video showing how to rebuild a common Zapier flow in SPARK in 60 seconds.

### Play 3: The "Wedge Expansion" (Land & Expand)
**Trigger:** A user is on the Starter plan ($15/mo for one app) but has a team of 5+ people or is using multiple tools.
**The Approach:** The "Stack Audit."
1. **Acknowledge the Value:** "Glad you're enjoying [App]. How is it comparing to your previous tool?"
2. **The Audit:** Ask what other tools they are paying for. (CRM, Chat, Forms, Scheduling, Automation).
3. **The Kill Shot:** "You're paying $15 for Ataqu Starter, plus $50 for Calendly, $100 for HubSpot, and $30 for Typeform. For just $39/mo, you can upgrade to Pro and get 5 apps – that covers your CRM, Chat, Scheduling, and more. Or go all‑in with Suite at $79 for all 10 apps. Same architecture, same login, no per‑user fees."
4. **Action:** Offer to upgrade them to Pro for a 14‑day trial at no extra cost – they can test the additional apps and see the native integrations in action.

---

## 4. THE DISCOVERY FRAMEWORK: THE "SAAS AUDIT"

We do not ask generic discovery questions like "What keeps you up at night?" We conduct a ruthless, factual SaaS Audit.

### 4.1 The Interrogation (Calm but Direct)
1. **"Can you list the top 5 SaaS tools your company pays for?"** (Forces them to confront the fragmentation).
2. **"What is your total monthly burn on software subscriptions?"** (Forces them to confront the math).
3. **"How many hours a week does your team spend fixing broken Zapier integrations or API syncs?"** (Forces them to quantify the hidden labor cost of fragmentation).
4. **"If you wanted to cancel [Competitor] today, how long would it take?"** (Forces them to confront their lock‑in).

### 4.2 The Pivot
Once they answer, pivot immediately to the solution.
> "That's exactly why Ataqu exists. 10 apps, one flat bill, native integrations. Let me show you how to migrate your data out of [Competitor] in the next 5 minutes."

---

## 5. THE DEMO PROTOCOL: "ZERO‑FLUFF, HIGH‑DENSITY"

**Rule:** Demos are strictly 15 minutes. No slide decks. No company history. We live in the app.

### 5.1 The Demo Flow
1. **The Unified Sidebar (2 mins):** Show the 10 apps in the Ataqu UI. Emphasize that this is one codebase, one login, one bill.
2. **The Native Integration (5 mins):** This is the money shot. Create a deal in CINQ. Show how it instantly triggers a notification in DIAL and updates a dashboard in VISTA via the outbox with `LISTEN/NOTIFY`. "No Zapier. No webhooks. Instant."
3. **The Architecture (3 mins):** For technical buyers, show the network tab. Show the 150ms response times. Show the SSE (Server‑Sent Events) cache invalidation. Prove the speed. Mention how email tracking is DoS‑proof via a bounded channel with atomic JSONL spill, how file uploads are managed via a chunked orphan reaper, and how idempotency uses 2× int4 advisory locks with negligible collision risk.
4. **The Escape Hatch (2 mins):** Go to settings. Show the 1‑click cancel button and the CSV/JSON export. "We earn your business every month. We don't trap you."
5. **The Close (3 mins):** "Want to connect your Google Workspace via AEGIS and import your first CSV right now?"

---

## 6. OBJECTION HANDLING: THE "CALM PREDATOR" RESPONSES

| Objection | The SaaS Stereotype Response | The Ataqu "Calm Predator" Response |
|-----------|------------------------------|------------------------------------|
| **"It's so cheap, it must be a toy/not enterprise-ready."** | "We have an Enterprise tier for $5,000/mo with dedicated support." | "We run on a Rust monolithic backend with PostgreSQL and SeaORM 2.0. We are profitable from day one. Our pricing is transparent and competitive – $15 for a single app, $39 for 5 apps, $79 for the full suite. We are cheap because our architecture doesn't bloat, not because we are a toy. Here is our public architecture doc." |
| **"We are too deeply integrated with HubSpot/Zapier to switch."** | "We have a dedicated migration team to help you." | "You're integrated with Zapier because HubSpot doesn't natively talk to Slack. In Ataqu, they share the same PostgreSQL event bus with `LISTEN/NOTIFY`. The integration is already done. Here is the 5‑minute migration CSV guide." |
| **"We need [Niche Feature X] that HubSpot has."** | "We can put that on our roadmap." | "Ataqu clones the 80% of features that 80% of companies use. If you need [Niche Feature X], you are paying HubSpot $1,000/month to subsidize it. Do you want to pay $1,000/mo for one feature, or $49/mo for everything else?" |
| **"I need to sign a 12‑month contract for procurement."** | "We can do an annual contract with a 10% discount." | "We don't do annual contracts. We don't believe in lock‑in. Put it on your credit card. If procurement complains, tell them you just saved the company $15,000 this year." |

---

## 7. THE "DECOMMISSION" HANDOFF (Customer Success)

The sale is not closed when the credit card is entered. The sale is closed when the competitor subscription is canceled.

### 7.1 The First 24 Hours
- **Automated Trigger:** When a user upgrades to the $49 bundle, trigger the "Stack Decommission" email.
- **Content:** "Welcome to Ataqu. Here are the 1‑click migration guides for HubSpot, Slack, and Zapier. Reply to this email if you need help formatting your CSVs."

### 7.2 The 30‑Day Check‑In
- **Action:** A human (not a bot) emails the user: "How is the migration going? Have you canceled [Competitor] yet?"
- **The Goal:** Actively push the user to decommission the competitor. We measure our Customer Success team by the "Decommission Rate," not just NPS.

---

## 8. SALES OPERATIONS & TECH STACK

Ataqu eats its own dog food. We do not use Salesforce.

1. **CRM:** Ataqu CINQ. All prospects and trial users are tracked in our own CRM.
2. **Chat:** Ataqu DIAL. All inbound sales chats route to DIAL. 24h SLA from a human.
3. **Scheduling:** Ataqu TEMPO. Prospects book demos through our native scheduling app.
4. **Analytics:** Ataqu VISTA. We track trial‑to‑paid conversion rates, feature adoption, and decommission rates in our own BI tool.

---


## 9. HYBRID OUTREACH: THE ZERO-BUDGET PROSPECTING ENGINE
> *"In 2026, the best leads aren't bought — they're earned through precision, persistence, and genuine value."*

While Ataqu is PLG-first, **founder-led outbound** is essential in the first 90 days. This section documents the exact zero-budget outreach system used by successful bootstrapped founders.

### 9.1 The Hybrid Outreach Philosophy
**Three channels, one unified sequence:**

| Channel | Purpose | When to use |
|---------|---------|-------------|
| **Email** | Primary pitch and follow-ups | Day 1, 3, 7 |
| **LinkedIn** | Warm connection + credibility | Day 2, 5 |
| **Twitter/X** | Public engagement + awareness | Ongoing |

**The Golden Rule:** Every outreach must feel personal. No copy-paste blasts. Use the tools below to scale, but always customize the first line.

### 9.2 The Free Outreach Stack (2026)

| Tool | What it does | Free limit |
|------|--------------|------------|
| **Origami** | Live web search + verified emails + LinkedIn profiles | 1,000 credits (no credit card) |
| **Networkly** | LinkedIn automation (connection requests) | Free tier |
| **Open InMail** | Bypass LinkedIn connection limits | Free (open source) |
| **Apollo.io** | Contact database + email verification | Free tier (limited) |
| **Manual research** | LinkedIn Sales Nav free + Google | Unlimited (time) |

**Step-by-Step List Building:**
1. Define your ICP: *"Founders and CTOs of 10-200 person B2B SaaS companies actively posting about HubSpot pricing or SaaS costs."*
2. Paste this ICP into **Origami**. Get 200+ verified contacts in 5 minutes.
3. Export to CSV. Import into a simple Google Sheet.
4. Use **Apollo's** free email verification to clean the list.
5. Start reaching out.

### 9.3 The 3-Touch Email Sequence (Templates)

**Touch 1 - The Hook (Day 1)**
> **Subject:** [Name] + HubSpot = ?
>
> Hi [First Name],
>
> I see [Company] is using HubSpot. You're probably dealing with their latest price increase (6% in August 2025).
>
> We built Ataqu: 10 native apps (CRM, chat, automation, analytics) for $49/month total. No per-user fees. No 3-year lock-in.
>
> Here's how the math breaks down: [Link to Kill Sheet]
>
> Worth a look?
>
> — [Your Name], Founder @ Ataqu

**Touch 2 - The Proof (Day 3)**
> **Subject:** Re: [Name] + HubSpot
>
> Quick follow-up. I know switching tools feels like a headache.
>
> Unlike Zapier-based integrations, Ataqu's apps share the same PostgreSQL database. Data flows natively via our outbox with LISTEN/NOTIFY. No brittle webhooks. No 5-minute polling delays.
>
> You can export all your data to CSV/JSON in 1 click. No lock-in. No traps.
>
> Test it here: [app.ataqu.com]
>
> — [Your Name]

**Touch 3 - The Rupture (Day 7)**
> **Subject:** One last thought on Ataqu
>
> I won't keep pinging you. Just one final number:
>
> HubSpot = $12k/year. Slack = $3k/year. Zapier = $1k/year.
> **Ataqu = $588/year. For everything.**
>
> If you ever get tired of SaaS bills that keep climbing, we're here.
>
> All the best,
> [Your Name]

**Expected results:** 15-25% reply rate with this sequence. Most replies come after Touch 2.

### 9.4 The LinkedIn Sequence

**Connection Request:**
> *"Hi [Name], I see we both care about [topic from their profile]. I'm building Ataqu — a unified OS for SMB SaaS. Would be great to connect."*

**Follow-up (after acceptance):**
> *"Thanks for connecting. Quick question: How many SaaS tools is your team currently using? Most founders I talk to say 20-40. It's become a huge cost center."*

**The Soft Pitch (if they engage):**
> *"We built Ataqu to replace the fragmented stack. 10 apps, native integrations, $49/mo. Here's a comparison page if you're curious: [link]"*

**The Hard Close (if they ask for more info):**
> *"Want to see it in action? 5-minute demo. No sales pitch. Just the product."*

### 9.5 The Twitter/X Engagement Strategy

**Daily Routine:**
1. **Search:** "HubSpot pricing" OR "SaaS costs" OR "Zapier limits" — find tweets from your ICP.
2. **Reply with value:** Not "Check out Ataqu." Instead: *"The average 20-person team spends $18k/year on SaaS. HubSpot alone is $12k of that. There's a cheaper way."*
3. **Post 3-5 original tweets per day** — alternate between:
   - Pricing punches (math comparisons)
   - Technical insights (architecture posts)
   - Build in public updates
   - Replies to industry influencers

**Example Tweet:**
> *"HubSpot charges $1,200/month for reporting. Ataqu includes it natively in $49/mo. The math is simple. The lock-in is not."*

### 9.6 Follow-up & Tracking (Without Salesforce)

| Task | Tool | Frequency |
|------|------|-----------|
| Track replies | Ataqu CINQ (custom deals) | Real-time |
| Schedule follow-ups | Ataqu TEMPO | Daily |
| Track conversion | Ataqu VISTA dashboard | Weekly |
| Log all activity | Google Sheets (simple) | Per outreach session |

**The 7-Day Rule:** If a prospect hasn't replied after 7 days, move them to a "Warm List." Re-engage them in 30 days with new content (e.g., a new Kill Sheet or Engineering Blog post).

### 9.7 Scaling Without Breaking the Bank

| Volume | Actions | Time Required |
|--------|---------|---------------|
| **Light (50/week)** | 5 emails + 10 LinkedIn requests/day | 30 min/day |
| **Medium (200/week)** | 20 emails + 30 LinkedIn requests/day | 1.5 hours/day |
| **Heavy (500+/week)** | Use automation tools (Networkly) + batch processing | 3 hours/day |

**Start with Light.** Prove the sequence works. Scale to Medium after 30 days. Heavy is only for when you have clear signs of product-market fit.

### 9.8 The "No Reply" Playbook

If a prospect ignores all 3 touches:

1. **Wait 30 days.** They're busy, not rejecting.
2. **Re-engage with new content:** *"We just published a HubSpot Kill Sheet. Thought you'd find it useful."*
3. **One final ping:** *"Just checking in — still relevant?"*

**Rule:** Never send more than 6 messages total. If they ignore 6, they're not your ICP.



### FINAL SALES DIRECTIVE
Ataqu sales reps are not order‑takers, but they are not traditional closers either. They are Technical Facilitators. Your job is to guide the SaaS hostage out of their enterprise contract and into the light of a unified, flat‑rate, mathematically sound architecture.

You do not need to manipulate. You just need to show them the math, show them the 1‑click cancel button, and let the SaaS oligopoly’s invoice do the rest of the talking.
