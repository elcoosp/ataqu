# 🎯 ATAQU CUSTOMER SUCCESS PLAYBOOK — Version 1.0 (Phase 1)
### The "Zero-Bloat" Guide to Retention, Expansion & Decommissioning

> **Executive Note:** In a Product-Led Growth (PLG) company, "Customer Success" is not a department; it is a philosophy. At Ataqu, Customer Success is the bridge between the product's technical brilliance and the customer's business outcomes. We do not measure success by "tickets closed" or "NPS surveys sent." We measure success by one metric: **The Decommission Rate**—how effectively we help users cancel their competitor subscriptions. This playbook transforms every CS interaction into a strategic intervention that accelerates the decommissioning of the fragmented SaaS stack.

---

## 1. THE CS PHILOSOPHY

### 1.1 Core Identity: The "Decommission Facilitator"
In marketing, Ataqu is the "Outlaw." In sales, we are the "Calm Facilitator." In Customer Success, we are the **"Decommission Facilitator."** Our job is not to "make customers happy." Our job is to help customers *leave their old vendors* and fully adopt Ataqu as their Unified OS.

### 1.2 The 3 Unbreakable CS Rules
1. **Proactive over Reactive:** We do not wait for users to churn. We anticipate friction points (e.g., CSV import struggles, Zapier migration confusion) and intervene *before* they become frustrations.
2. **Human Over Bot:** Automated chatbots are strictly forbidden. Every CS interaction is a human conversation, even at scale. If a user feels like they are talking to a bot, we have failed.
3. **Success = Decommissioning:** The CS team's primary KPI is not NPS, not CSAT, not ticket volume. It is the **Decommission Rate**—the percentage of customers who actively cancel at least one competitor tool within 30 days of upgrading to the $49 bundle.

### 1.3 The CS Funnel
```
Trial User → Active Single-App User → Multi-App User → $49 Bundle User → Decommissioned Competitor Stack → Advocate
```

---

## 2. CUSTOMER LIFECYCLE MANAGEMENT

### Phase 1: The Trial (0-7 Days)
**The Goal:** Get the user to activate their first app and experience the "150ms Rust speed."

| Trigger | CS Action | Channel | Owner |
|---------|-----------|---------|-------|
| **Signed up, no entity created in 24h** | Warm welcome email: "Stuck? Reply and tell us what's confusing. No bots." | Email | CS Agent |
| **Imported first CSV (success)** | "🎯 You imported your first data. Here's how to connect CINQ to DIAL in 1 click." | In-App | Automated |
| **Imported CSV (partial failure)** | "We noticed some rows didn't import. Let's fix this together. Reply with your CSV and we'll help." | Email/DIAL | CS Agent |
| **Created 10+ entities in 1 app** | "You're a power user! Want to save $XX/mo by upgrading to the 5-app bundle?" | In-App | Automated |

### Phase 2: The Wedge Expansion (7-30 Days)
**The Goal:** Expand the user from a single wedge app ($3–$15/mo) to the $49/mo bundle.

| Trigger | CS Action | Channel | Owner |
|---------|-----------|---------|-------|
| **Using 1 app, no native integrations** | "Stop copying data by hand. Connect [App A] to [App B] in 1 click." | In-App | Automated |
| **1 app → 3 apps (all stand-alone)** | "You're paying $15 + $9 + $9 = $33/mo. Upgrade to the 5-app bundle for $29/mo and save $4." | In-App | Automated |
| **3+ apps activated** | "You're almost there! The 10-app bundle is $49/mo. You're currently paying $XX. Upgrade in 1 click." | In-App | Automated |
| **Upgraded to $49 bundle** | Personalized welcome: "Welcome to the Unified OS. Here's your Decommission Checklist. Let's cancel HubSpot." | DIAL/Email | CS Agent |

### Phase 3: The Decommission (30-90 Days)
**The Goal:** The user actively cancels at least one competitor subscription.

| Trigger | CS Action | Channel | Owner |
|---------|-----------|---------|-------|
| **Upgraded to $49 bundle, but no migration guides opened in 7 days** | "You're saving $XX/mo with Ataqu. Let's make it official. Here's how to cancel HubSpot in 5 minutes." | Email | CS Agent |
| **Opened migration guide** | "We saw you started the HubSpot migration. Need help formatting your CSV? Reply and we'll do it for you." | DIAL | CS Agent |
| **Imported data from competitor** | "Your data is in! You're ready to cancel [Competitor]. Here's their cancellation phone number (seriously)." | In-App | Automated |
| **Confirmed competitor cancellation** | "🎯 You just decommissioned [Competitor]! That's a win. Want to tackle the next one?" | DIAL/Email | CS Agent |

### Phase 4: The Retention & Advocacy (90+ Days)
**The Goal:** Turn the customer into a brand advocate who recommends Ataqu to peers.

| Trigger | CS Action | Channel | Owner |
|---------|-----------|---------|-------|
| **Decommissioned 3+ competitors** | "You've decommissioned 3 competitors! We'd love to feature your story. 15-min interview?" | DIAL/Email | CS Agent |
| **6+ months active, 0 support tickets** | "You're a power user. Want to join our beta program for upcoming features?" | Email | CS Agent |
| **Suggested in conversation by user** | (Manual) Send a handwritten thank-you note. | Physical | CS Lead |

---

## 3. CUSTOMER HEALTH SCORING

We do not use vague "sentiment analysis" models. We use a deterministic, data-driven Health Score that predicts churn risk.

### 3.1 The Ataqu Health Score (0-100)

| Category | Weight | Scoring Criteria |
|----------|--------|------------------|
| **Activation Depth** | 30% | Number of apps activated (1-10). 10 apps = 30 points. |
| **Decommission Progress** | 25% | Number of competitors actively canceled (1-5). 5 cancels = 25 points. |
| **Native Integration Count** | 20% | Number of cross-app integrations enabled (e.g., CINQ→DIAL). 5 integrations = 20 points. |
| **Recent Activity (7d)** | 15% | Daily active user counts. 7 days active = 15 points. |
| **Support Sentiment** | 10% | Positive/neutral support interactions. No unresolved P1 issues = 10 points. |

**Risk Tiers:**
- **Green (80-100):** Healthy. Low churn risk. Focus on expansion.
- **Yellow (50-79):** At risk. Investigate activation gaps. Proactive outreach needed.
- **Red (0-49):** High churn risk. Immediate intervention required. Escalate to CS Lead.

### 3.2 Health Score Dashboard (VISTA)

The CS team monitors a real-time Health Score dashboard built inside VISTA:

| Widget | Data Source | Frequency |
|--------|-------------|-----------|
| **Customer List** (sorted by score) | `collab_crm.tenants` + aggregates | Real-time |
| **Red Customers** (score < 50) | Health Score formula | Every 10 minutes |
| **Decommission Rate (30d)** | Competitor cancellation events | Daily |
| **App Adoption Heatmap** | App activation events | Daily |

---

## 4. EXPANSION STRATEGIES

Expansion is not about "upselling." It is about helping the user realize the full value of the Unified OS.

### 4.1 The "Bundle Migration" Play
**Scenario:** A user is paying for 4+ standalone apps ($39+/mo).
**The Play:**
1. Identify users with 4+ activated apps on individual plans.
2. Send an automated in-app notification: "You're paying $XX/mo. Upgrade to the full 10-app bundle for $49/mo."
3. If the user doesn't upgrade in 7 days, a CS agent reaches out: "We noticed you're using 4 apps. The bundle would save you $XX/mo. Want to activate the other 6 free for 14 days?"
4. **Success Metric:** Bundle conversion rate from individual plans.

### 4.2 The "Decommission Challenge" Play
**Scenario:** A user has activated CINQ (CRM) but is still paying for HubSpot.
**The Play:**
1. Identify users who have imported HubSpot data but haven't canceled HubSpot.
2. Send a "Decommission Challenge": "You've imported 500 deals. HubSpot is costing you $X/mo. Cancel them today and we'll send you an Ataqu hoodie."
3. Use social proof: "23 other customers have decommissioned HubSpot this month. You're next."
4. **Success Metric:** HubSpot cancellation rate within 30 days of import.

### 4.3 The "VISTA Activation" Play
**Scenario:** A user has CINQ, DIAL, and VAULT active but hasn't activated VISTA.
**The Play:**
1. Identify users with 3+ data-generating apps (CINQ, VAULT, PAUSE) but no VISTA.
2. Send an automated notification: "Your data is ready for analytics. Activate VISTA to see your revenue dashboard in 1 click."
3. If no activation in 7 days, a CS agent sends a personalized Loom video showing their dashboard pre-configured.
4. **Success Metric:** VISTA activation rate among eligible users.

---

## 5. CHURN PREVENTION & RISK MITIGATION

Churn is the enemy of the Calm Predator. We prevent churn through proactive outreach and rapid issue resolution.

### 5.1 Churn Signal Detection

| Signal | Detection | Action | Owner |
|--------|-----------|--------|-------|
| **Health Score drops below 50** | Automatic alert | CS Lead assigns an agent for immediate outreach. | CS Lead |
| **User visits "Cancel" page** | Event tracking | "We noticed you looked at cancellation. Tell us what's broken." (No surveys, just raw text.) | Automated |
| **0 app activity in 14 days** | Inactivity metric | "Haven't seen you in a while. Need help with anything?" | CS Agent |
| **3+ support tickets in 7 days** | Support logs | "We're seeing you're hitting some bugs. Let's hop on a quick call to resolve them." | CS Agent |
| **Competitor promotion** | Social listening | "We saw [Competitor] is offering a discount. Let's talk about why you chose Ataqu." | CS Lead |

### 5.2 The "Save" Sequence

When a user is at risk (Red Health Score), the CS team executes a structured "Save" sequence:

**Step 1: Immediate Outreach (Day 0)**
> "We noticed you haven't been active in a few weeks. Is there something blocking your workflow? Reply and tell us what's broken."

**Step 2: Diagnostic (Day 2)**
> "If you're having trouble with [specific app], we can help you migrate your data or provide a guided walkthrough. Let's solve this together."

**Step 3: Escalation (Day 5)**
> "We really value you as a customer. If Ataqu isn't working for you, we don't want you to pay. But tell us what we could have done better."

**Step 4: Exit (Day 7)**
> "We understand. Your data export is ready. You can cancel in 1 click. The door is always open."

### 5.3 The "Zero Bloat" Churn Policy

- **No 3-year lock-ins.** If a user wants to leave, they leave.
- **No retention surveys.** We ask one question: *"What sucked?"* and we read every response.
- **No "we'll miss you" guilt trips.** We respect their decision and help them export their data cleanly.

---

## 6. CUSTOMER SUCCESS TOOLS & TECH STACK

Ataqu eats its own dog food. We do not use external CS tools.

| Function | Tool | Rationale |
|----------|------|-----------|
| **CRM** | Ataqu CINQ | All customer data lives in our own CRM. |
| **Chat** | Ataqu DIAL | All CS conversations routed through DIAL. |
| **Scheduling** | Ataqu TEMPO | Customer check-ins booked via TEMPO. |
| **Analytics** | Ataqu VISTA | Health Score dashboard built in VISTA. |
| **Support** | `support@ataqu.so` + DIAL | No Zendesk. No Intercom. No external tools. |
| **Automation** | Ataqu SPARK | CS workflows (e.g., health score alerts) built in SPARK. |

---

## 7. CS TEAM STRUCTURE

| Role | Count | Responsibilities |
|------|-------|------------------|
| **CS Lead** | 1 | Strategy, health score monitoring, escalation handling, Decommission Rate accountability |
| **CS Agent** | 1-3 | Proactive outreach, user onboarding, migration assistance, churn prevention |
| **Engineering Support** | 1 (part-time) | Technical escalations, debugging, fixing CSV import issues |

**Hiring Criteria:**
- Technical empathy (e.g., understands what a CSV is and why HubSpot exports are broken).
- No scripts. CS agents write their own emails—they are humans, not robots.
- Obsessed with the Decommission Rate.

---

## 8. CS METRICS & KPIs

| Metric | Definition | Target | Owner |
|--------|------------|--------|-------|
| **Decommission Rate** | % of $49 bundle users who cancel ≥1 competitor within 30 days | > 40% | CS Lead |
| **Health Score Average** | Average health score across all active tenants | > 75 | CS Lead |
| **Red Customer Recovery** | % of Red customers who return to Green within 14 days | > 60% | CS Agent |
| **Bundle Conversion Rate** | % of individual-plan users who upgrade to $49 bundle | > 25% | CS Agent |
| **CSAT Score** | Post-resolution satisfaction score | > 4.8/5 | CS Lead |

---

### FINAL CS DIRECTIVE

Customer Success at Ataqu is not about "happiness." It is about **liberation**. We liberate users from the fragmented SaaS oligopoly. Every interaction—whether it's helping with a CSV import, showing how to connect CINQ to DIAL, or providing the HubSpot cancellation phone number—is a step toward decommissioning the old world and adopting the new.

We do not cheerlead. We facilitate. We do not upsell. We expand. We do not trap. We liberate.

**Ataqu. Decommission the stack.**
