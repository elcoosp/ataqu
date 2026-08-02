# ATAQU MLP FEATURE SPECIFICATION — "The Predator's Prey"

  **Version:** 2.5
  **Date:** 2026-08-29
  **Document Type:** Product Feature Specification (MLP Scope)
  **Brand Domain:** `ataqu.com`

  > **PRODUCT NOTE:** This document defines the *what* — the exact feature set required for Ataqu's Minimum Lovable Product (MLP). While the architecture documents (v143.0) define *how* we build, this document defines *what* we build. It is the bridge between competitive research and the implementation tasks. Every feature listed here is validated against the 2025–2026 feature sets of our competitors. Features marked "Ignored" are deliberate omissions — bloat we refuse to clone.

  ---

  ## 1. THE MLP PHILOSOPHY

  > **"We don't clone everything. We clone the 80% that delivers 95% of daily value, make it 10x faster, and connect it natively."**

  | Feature Type | Ataqu Strategy |
  |--------------|----------------|
  | **P0 (Must Have)** | Faithful clone — the 80% of features used daily |
  | **P1 (Should Have)** | Simplified clone — acceptable for v1.0, polish for v1.1 |
  | **Ignored (Won't Have)** | Bloat — enterprise niche features, AI gimmicks, or scope creep |

  **2026 Market Context:** The SaaS market has split into two camps. AI is no longer just a feature — it's becoming the fabric of every platform. However, for SMBs, the core operational features remain the same. We are not chasing AI gimmicks; we are building a reliable, fast, native OS.

  ---

  ## 2. CINQ (CRM) — vs HubSpot

  **HubSpot 2025–2026 Context:** HubSpot has aggressively pushed AI across its platform — AI-powered lead scoring with conditional logic, AI image generation, Smart Deal Progression that analyzes call transcripts, and an AEO (Answer Engine Optimization) tool. They've also launched a Data Hub to unify structured and unstructured data, and an MCP server allowing AI tools to read/write CRM data via natural language. The trend is clear: HubSpot is betting everything on AI as the differentiator. We are not.

  **The 80% of HubSpot that SMBs actually use daily:**

  | Feature | Status | Justification |
  |---------|--------|---------------|
  | **Contacts** (name, email, phone, company) | P0 | 100% of users. The atomic unit of CRM. |
  | **Deals** (name, amount, stage, probability, owner) | P0 | 100% of users. The revenue engine. |
  | **Pipeline** (visual drag-and-drop between stages) | P0 | "The reason CRMs exist" — visual deal tracking. |
  | **Activities** (notes, calls, emails, meetings) | P0 | Deal context and history. Every sales rep logs activities. |
  | **Search** (name, company, email — PostgreSQL tsvector, <50ms) | P0 | Speed is our differentiator. HubSpot search can lag. |
  | **CSV Import** (column mapping, validation) | P0 | Migration from HubSpot — the "escape hatch." |
  | **CSV Export** | P0 | "No lock-in" — our core promise. |
  | **Tasks** (to-dos, assignments, due dates) | P1 | ~70% of users. Important but not blocking. |
  | **Lead Scoring** (basic — rules-based, not AI) | P1 | ~60% of users. We do NOT need HubSpot's AI scoring. |
  | **Reporting** (dashboards, revenue, pipeline) | P1 | ~50% of users. VISTA handles this natively. |
  | **Email Tracking** (opens, clicks) — DoS‑isolated with atomic spill | P0 | ~50% of users. Table stakes for sales. Implemented with bounded channel, atomic JSONL file rotation (nanos+uuid, process exactly once). |
  | **Workflows** (basic automations) | P1 | ~40% of users. SPARK handles this. |
  | **AI Sales Assistant** | Ignored | HubSpot's core differentiator. We are not an AI company. |
  | **Smart Deal Progression** | Ignored | Analyzes call transcripts — overkill for SMBs. |
  | **Data Hub** | Ignored | Enterprise data unification. Bloat. |
  | **Sequences** (automated follow-up emails) | Ignored | Niche. Can be built in SPARK if needed. |
  | **Custom Fields** | P0 | Stored as `JSONB` with graceful degradation: `@>` exact match (indexed), `->>` ILIKE single-field (scan), `jsonb_each_text` cross-field (expensive, rate-limited & result‑capped). No EAV. Column promotion for high-traffic fields. |
  | **PII Data** (email, phone) | P0 | **Compile‑time redaction:** `Email`/`PhoneNumber` newtypes with `Debug`/`Display` as `[REDACTED]`. **No `Serialize` impl on newtypes** — serialization is handled by `ApiEmail` wrapper at the API boundary. |

  **Ataqu Advantage:** CINQ is not "HubSpot with AI." CINQ is "HubSpot without the bloat, without the 3-year lock-in, without the per-user tax, and with native integration to DIAL and SPARK." We win on speed, price, integration, and compile‑time PII safety — not AI gimmicks.

  ---

  ## 3. DIAL (Chat) — vs Slack

  **Slack 2025–2026 Context:** Slack has added 30+ AI features, including agentic Slackbot capabilities (draft emails, schedule meetings, sift through inboxes), AI-powered Workflow Builder steps (summarize, translate, draft), Custom Connectors for Enterprise Search, and an updated Block Kit with cards, alerts, carousels, and data tables. They are positioning Slack as an "agent orchestration" platform. Again: AI as the differentiator.

  **The 80% of Slack that teams actually use daily:**

  | Feature | Status | Justification |
  |---------|--------|---------------|
  | **Channels** (public + private) | P0 | 100% of users. The container for all communication. |
  | **Messages** (text, emojis, reactions) | P0 | 100% of users. The core unit. |
  | **Threads** (replies attached to a parent) | P0 | ~90% of users. Essential for organization. |
  | **Mentions** (`@user`, `@channel`) | P0 | ~90% of users. The notification engine. |
  | **File Sharing** (images, documents) | P0 | ~80% of users. Table stakes. |
  | **Search** (message history, files) | P0 | ~80% of users. Slack's search is notoriously slow. Ours uses PostgreSQL tsvector GIN indexes. |
  | **Presence** (online/offline/away) | P1 | ~70% of users. Useful but not critical. Implemented via `PresenceStore` trait (Phase 1 in-memory, Phase 2 Postgres). |
  | **Workflow Builder** (basic automations) | P1 | Slack added AI to this. We keep it simple — triggers and actions. |
  | **Focus Mode** (mute notifications) | P1 | ~50% of users. Nice-to-have. |
  | **Huddles** (audio calls) | Ignored | "Most users use Zoom anyway." Infrastructure bloat. |
  | **Apps/Integrations** (3rd-party) | Ignored | We are native. No need for 2,600+ Slack apps. |
  | **AI Slackbot** (agentic capabilities) | Ignored | Drafting emails and scheduling meetings — we have other apps for that. |
  | **Custom Connectors** | Ignored | Enterprise search. Bloat. |

  **Ataqu Advantage:** DIAL is "Slack without the per-user tax, without the AI bloat, with native CRM and support ticket integration." Your chat lives in the same ecosystem as your deals. When a customer messages support, the agent sees the CINQ deal history in the same sidebar.

  ---

  ## 4. PIVOT (Docs & Databases) — vs Notion

  **Notion 2025–2026 Context:** Notion has fully embraced AI and agents. Notion AI can now generate and edit images. AI Meeting Notes include speaker labels. Notion Agents can read/write Excel and PowerPoint files. You can build interactive HTML blocks (e.g., ROI calculators). Notion 3.6 introduced External Agents (orchestrate Claude, Cursor, etc.) and Workers (run custom code in a secure sandbox). They are turning Notion into a "hub for AI agents".

  **The 80% of Notion that teams actually use daily:**

  | Feature | Status | Justification |
  |---------|--------|---------------|
  | **Documents** (Markdown, headings, paragraphs) | P0 | 100% of users. The core unit. |
  | **Databases** (tables, views, filters) | P0 | ~80% of users. The reason people use Notion over simple docs. |
  | **Search** (PostgreSQL tsvector GIN, <15ms) | P0 | Notion search is notoriously slow (2-5s). Speed is our advantage. |
  | **Relations** (link a doc to a CINQ deal) | P0 | "Databases that talk to each other" — our native integration advantage. |
  | **Templates** (with variables) | P1 | "Save hours on recurring workflows." ~70% of users. |
  | **Checklists** (task checkboxes) | P1 | ~70% of users. Simple but essential. |
  | **Sharing** (read/write permissions) | P1 | ~60% of users. Basic collaboration. |
  | **Version History** | P1 | ~50% of users. Important for compliance. |
  | **Blocks** (code, tables, embeds) | P1 | ~50% of users. Nice-to-have. |
  | **AI Image Generation** | Ignored | Notion AI's flagship feature. We are not an AI company. |
  | **AI Meeting Notes** | Ignored | Speaker labels, summaries — overkill. |
  | **External Agents** | Ignored | Orchestrating Claude, Cursor — enterprise bloat. |
  | **Workers** (custom code sandbox) | Ignored | Notion's "secure sandbox for custom code" — overkill. |
  | **Interactive HTML Blocks** | Ignored | ROI calculators — can be built in VISTA or SPARK. |
  | **Calendar/Projects/Gantt** | Ignored | Scope creep. Notion added these, but they're rarely used. |

  **Ataqu Advantage:** PIVOT is "Notion without the AI bloat, with sub-15ms search, and with native CRM and inventory relations." Your project docs are linked to your deals. Your product specs are linked to your inventory. No Zapier required.

  ---

  ## 5. SPARK (Automation) — vs Zapier

  **Zapier 2025–2026 Context:** Zapier now has 9,000+ app integrations. They've added AI Guardrails for safety checks on any Zap, Copilot for AI-powered Zap creation and editing, auto-generated change summaries, and expanded enterprise governance for AI agents. The trend: Zapier is becoming an enterprise AI governance platform.

  **The 80% of Zapier that users actually build:**

  | Feature | Status | Justification |
  |---------|--------|---------------|
  | **Triggers** ("When X happens") | P0 | 100% of users. The starting point of every automation. |
  | **Actions** ("Then do Y") | P0 | 100% of users. The output of every automation. |
  | **Conditions** ("If amount > 1000") | P0 | ~80% of users. Basic branching logic. |
  | **Native Execution** (no webhooks, <1s) | P0 | **The Ataqu advantage.** Zapier polls (5-15 min delays). We use outbox events with `LISTEN/NOTIFY`. |
  | **Outbound Webhooks** (to Stripe, etc.) | P1 | ~60% of users. For external systems. |
  | **Scheduling** ("Every day at 9 AM") | P1 | ~50% of users. Time-based triggers. |
  | **Test Mode** (simulation before publish) | P1 | ~40% of users. Safety net. |
  | **Error Handling** (retry, DLQ) | P1 | ~30% of users. We handle this natively in the outbox. |
  | **9,000+ App Integrations** | Ignored | We are native. We integrate our 10 apps. We don't need 9,000. |
  | **AI Copilot** | Ignored | Zapier's AI assistant. We don't need AI to build automations. |
  | **AI Guardrails** | Ignored | Enterprise governance. Bloat. |
  | **Complex Workflows** (multi-step with branches) | Ignored | That's Make.com's territory. Zapier users build simple 2-3 step Zaps. |

  **The Top 3 Zaps (based on Zapier's own usage data):**
  1. `CINQ: Deal Won → DIAL: Create channel #onboarding-{deal}`
  2. `SOND: Form Submitted → CINQ: Create Lead`
  3. `VAULT: Stock < Threshold → DIAL: Alert #logistics`

  **Ataqu Advantage:** SPARK is "Zapier without the task limits, without the webhooks, without the 5-15 minute polling delays, and with native integration to our 10 apps." Execution is <1s. No per-task pricing. No brittle APIs.

  ---

  ## 6. TEMPO (Scheduling) — vs Calendly

  **Calendly 2025–2026 Context:** Calendly has integrated with ChatGPT — you can now create/update event types, generate scheduling links, and book meetings through natural language conversations. They've introduced a refreshed UI with a new Meetings page. The core scheduling features remain unchanged.

  **The 80% of Calendly that users actually use:**

  | Feature | Status | Justification |
  |---------|--------|---------------|
  | **Booking Links** (shareable, public) | P0 | 100% of users. The primary interface. |
  | **Calendar Sync** (Google, Outlook) | P0 | 100% of users. OAuth with auto-refresh (ADR-025). |
  | **Event Types** (1:1, group) | P0 | 100% of users. The core configuration. |
  | **Availability** (defined time slots) | P0 | 100% of users. The scheduling engine. |
  | **Reminders** (email, SMS auto) | P0 | ~80% of users. Reduces no-shows. |
  | **Timezone Detection** (auto) | P0 | ~80% of users. Essential for remote teams. |
  | **Instant Bookings** ("Book now" buttons) | P1 | ~70% of users. Convenience. |
  | **Custom Emails** (invitation, reminder) | P1 | ~60% of users. Branding and personalization. |
  | **No-Show Workflows** (auto-follow-up) | P1 | ~50% of users. Reduces revenue loss. **Ataqu implementation:** `MeetingJoined` WebSocket hook for automatic attendance; `no_show_worker` runs every 5 minutes using sargable `ends_at` generated column with 24‑hour upper bound; follow-ups within 15-30 mins. |
  | **CRM Integration** (CINQ → activity) | P1 | **The Ataqu advantage.** Native via outbox. No Zapier. |
  | **ChatGPT Integration** | Ignored | Natural language booking. Gimmick. |
  | **Round-Robin** (distribute to team) | Ignored | Niche. Can be built later. |
  | **Collective Events** (multiple hosts) | Ignored | Niche. |

  **Ataqu Advantage:** TEMPO is "Calendly without the per-user fees, with native CRM integration, and with timely no-show detection within 15 minutes." When a prospect books a meeting, it automatically creates a CINQ activity. No Zapier. No copy-pasting.

  ---

  ## 7. SOND (Forms) — vs Typeform

  **Typeform 2025–2026 Context:** Typeform has launched Growth Flow and Research Flow — two new products that turn form submissions into automated flows. They've added a Workflow Builder, Knowledge Quiz, Shopify Integration, Email Builder, Match Quizzes, and real-time collaboration. They are moving from "forms" to "flows".

  **The 80% of Typeform that users actually use:**

  | Feature | Status | Justification |
  |---------|--------|---------------|
  | **Visual Builder** (drag-and-drop questions) | P0 | 100% of users. The primary interface. |
  | **Question Types** (text, email, choice, date) | P0 | 100% of users. The core building blocks. |
  | **Conditional Logic** (branching) | P0 | ~80% of users. The reason people choose Typeform over Google Forms. |
  | **Submissions** (view responses) | P0 | 100% of users. The output. |
  | **CSV Export** | P0 | ~80% of users. Data portability. |
  | **Branding** (colors, logo, fonts) | P1 | ~70% of users. Professional appearance. |
  | **Notifications** (email on submission) | P1 | ~60% of users. Real-time alerts. |
  | **Webhooks** (→ CINQ, SPARK) | P1 | **The Ataqu advantage.** Native via outbox. No Zapier. |
  | **Multi-Question Pages** (one per page) | P1 | ~50% of users. Typeform's signature UX. |
  | **Growth Flow / Research Flow** | Ignored | Automated flows. We have SPARK for that. |
  | **Workflow Builder** | Ignored | Typeform's automation. We have SPARK. |
  | **AI Features** | Ignored | Typeform AI. We are not an AI company. |
  | **Payment Questions** | Ignored | Shoppable storefronts. Niche. |

  **Ataqu Advantage:** SOND is "Typeform without the response limits, with native CRM and automation integration." A form submission creates a CINQ lead and triggers a SPARK workflow. No Zapier. No per-response pricing.

  ---

  ## 8. VAULT (Inventory) — vs Cin7

  **Cin7 2025–2026 Context:** Cin7 has added Smart Reorder V2 with demand forecasting and green rising arrows for growing SKUs. They've introduced Cin7 Pay (financial control) and Cin7 ForesightAI (inventory forecasting and reorder recommendations). They have 160+ new partners and an AI Lab. They've also improved Shopify auto-sync (every 15 minutes), Amazon FBA stock sync, and added API comment support for stock adjustments.

  **The 80% of Cin7 that SMBs actually use:**

  | Feature | Status | Justification |
  |---------|--------|---------------|
  | **Products** (name, SKU, price, description) | P0 | 100% of users. The catalog. |
  | **Variants** (size, color, stock quantity) | P0 | ~90% of users. Essential for retail. |
  | **Real-time Stock** (current quantity) | P0 | 100% of users. The core function. |
  | **Movements** (in/out, date, reason) | P0 | ~80% of users. Audit trail. |
  | **Low Stock Alerts** (threshold → notification) | P0 | ~70% of users. Prevents stockouts. |
  | **Multi-Channel** (Shopify, Amazon) | P1 | ~60% of users. Important for e-commerce. |
  | **Multi-Warehouse** | P1 | ~50% of users. For businesses with multiple locations. |
  | **Reservations** (deal won → reserve stock) | P1 | **The Ataqu advantage.** Native CINQ integration via outbox. |
  | **Smart Reorder** (demand forecasting) | Ignored | Cin7's Smart Reorder V2. Overkill for SMBs. |
  | **ForesightAI** | Ignored | AI forecasting. We are not an AI company. |
  | **Manufacturing / Kitting** | Ignored | Niche. |
  | **Cin7 Pay** | Ignored | Financial control. We have billing in core schema. |

  **Ataqu Advantage:** VAULT is "Cin7 without the AI bloat, with native CRM and order management integration." When a CINQ deal is won, VAULT automatically reserves stock. When stock hits zero, SPARK pauses the sales sequence. No Zapier. No middleware.

  ---

  ## 9. PAUSE (HR) — vs Personio

  **Personio 2025–2026 Context:** Personio has introduced a Documents Hub — a centralized location for all employee documents. They've simplified employee roles and permissions management. They've added overnight time tracking logic and automatic recalculation of allowances when base salary changes. They are also adding flexible job visibility (parent company + legal entity job portals).

  **The 80% of Personio that SMBs actually use:**

  | Feature | Status | Justification |
  |---------|--------|---------------|
  | **Employees** (name, email, role, hire date) | P0 | 100% of users. The employee database. |
  | **Leave Requests** (request, approval, balance) | P0 | 100% of users. The primary HR function. |
  | **Approval Workflow** (manager → approve/reject) | P0 | ~80% of users. Standard HR process. |
  | **Documents** (contracts, pay slips) | P1 | ~70% of users. Centralized storage. |
  | **Directory** (search by name, role) | P1 | ~70% of users. "Who works here?" |
  | **Onboarding** (new hire workflow) | P1 | ~60% of users. Standard HR process. |
  | **Reporting** (headcount, turnover) | P1 | ~50% of users. Basic HR analytics. |
  | **Time Tracking** (overnight logic) | P1 | ~40% of users. |
  | **Payroll** | Ignored | Too complex, regulatory. |
  | **Performance Reviews** | Ignored | Too complex. |
  | **Salary Management** | Ignored | Overkill for SMBs. |
  | **Documents Hub** | P1 | Centralized document management — we can implement a simpler version. |

  **Ataqu Advantage:** PAUSE is "Personio without the payroll complexity, with native AEGIS integration." When an employee is offboarded in PAUSE, AEGIS instantly revokes their access to all 10 apps via outbox event. No manual deprovisioning. PII (email, phone) redacted at compile time via newtypes; no `Serialize` on newtypes; serialization via API wrappers.

  ---

  ## 10. AEGIS (SSO & Security) — vs Okta

  **Okta 2025–2026 Context:** Okta is expanding identity controls for AI agents — covering tool access, agent-to-agent communication, and periodic access reviews. They've introduced an Okta MCP Server for natural language interaction with Okta. They're adding Verifiable Digital Credentials (VDCs) and digital identity verification. They've also added Identity Threat Protection with Okta AI and release controls for Okta Verify.

  **The 80% of Okta that SMBs actually use:**

  | Feature | Status | Justification |
  |---------|--------|---------------|
  | **SSO** (Google, Microsoft) | P0 | 100% of users. The core function. |
  | **MFA** (TOTP — Google Authenticator) | P0 | 100% of users. Security baseline. |
  | **User Management** (invite, role assignment) | P0 | 100% of users. The admin interface. |
  | **JWT** (sessions, refresh tokens) | P0 | 100% of users. The authentication mechanism. |
  | **API Keys** (generate, permissions) | P1 | ~60% of users. For developers. |
  | **Bot Detection** | P1 | ~50% of users. Security. |
  | **RBAC** (roles: admin, member, viewer) | P1 | ~50% of users. Access control. |
  | **SCIM Provisioning** | Ignored | Enterprise. Overkill for SMBs. |
  | **FastPass** (biometrics) | Ignored | Gadget. |
  | **AI Agent Identity** | Ignored | Enterprise governance. Bloat. |
  | **MCP Server** | Ignored | Natural language Okta. Gimmick. |

  **Ataqu Advantage:** AEGIS is "Okta without the per-user fees, built into the OS." SSO is not a separate product — it's the foundation of Ataqu. Onboard a new employee in 1 click; they instantly get secure access to all 10 apps.

  ---

  ## 11. VISTA (Analytics & BI) — vs Tableau

  **Tableau 2025–2026 Context:** Tableau has fully embraced AI with Tableau Agent (conversational analytics). They've introduced Tableau Next with unmetered AI usage, data transforms, and analytical queries. Tableau can now pull data from PDFs and email threads. They've added dynamic Sankey diagrams, automated knowledge graph creation (Tableau Agentic Analytics Platform), and VizQL data service for live dashboard queries.

  **The 80% of Tableau that SMBs actually use:**

  | Feature | Status | Justification |
  |---------|--------|---------------|
  | **Dashboards** (configurable widgets) | P0 | 100% of users. The primary output. |
  | **Real-time KPIs** (revenue, pipeline, stock) | P0 | **The Ataqu advantage.** No ETL. Native data. |
  | **Charts** (bar, line, pie) | P0 | 100% of users. The visualization basics. |
  | **Filters** (by date, team, product) | P0 | ~80% of users. Data slicing. |
  | **Drag & Drop** ("ask a question of your data") | P1 | ~70% of users. Tableau's signature UX. |
  | **Export** (PDF, CSV, PNG) | P1 | ~60% of users. Sharing and reporting. |
  | **Custom SQL** (for power users) | P1 | ~40% of users. Advanced queries. |
  | **Tableau Agent** (conversational AI) | Ignored | AI chat. We are not an AI company. |
  | **Tableau Next** (unmetered AI) | Ignored | AI analytics. Bloat. |
  | **ETL / Data Pipelines** | Ignored | We are native. No ETL needed. |
  | **PDF/Email Data Ingestion** | Ignored | Pulling data from PDFs and emails. Niche. |
  | **Knowledge Graph** | Ignored | Agentic analytics. Overkill. |

  **Ataqu Advantage:** VISTA is "Tableau without the data engineers, without the ETL pipelines, with native data from your CRM, inventory, and chat." The dashboard is already plugged into the source code. Real-time, cross-app analytics with zero ETL.

  ---

  ## 12. SUMMARY: MLP FEATURE MATRIX

  | App | P0 Features (Ship Now) | P1 Features (v1.1) | Ignored (Never Build) |
  |-----|----------------------|-------------------|----------------------|
  | **CINQ** | Contacts, Deals, Pipeline, Activities, Search, Import/Export | Tasks, Scoring, Reporting, Email Tracking (DoS-isolated with atomic spill), Custom Fields (JSONB three-tier), PII redaction (newtypes, no `Serialize`) | AI Sales Assistant, Smart Deal Progression, Data Hub |
  | **DIAL** | Channels, Messages, Threads, Mentions, Search, Files | Presence (via `PresenceStore` trait), Workflows | Huddles, Apps, AI Slackbot |
  | **PIVOT** | Docs (Markdown), Databases, Search, Relations | Templates, Checklists, Sharing, Version History | AI Image Gen, External Agents, Workers, Calendar |
  | **SPARK** | Triggers, Actions, Conditions, Native Execution | Webhooks, Scheduling, Test Mode | 9,000+ Apps, AI Copilot, Complex Workflows |
  | **TEMPO** | Links, Calendar Sync, Event Types, Availability, Reminders | Instant Bookings, Custom Emails, No-Show (timely, 15-min detection) | ChatGPT Integration, Round-Robin |
  | **SOND** | Visual Builder, Question Types, Logic, Submissions, Export | Branding, Notifications, Webhooks | Growth Flow, Workflow Builder, AI Features |
  | **VAULT** | Products, Variants, Stock, Movements, Alerts | Multi-Channel, Multi-Warehouse, Reservations | Smart Reorder, ForesightAI, Manufacturing |
  | **PAUSE** | Employees, Leave, Approvals | Documents, Directory, Onboarding | Payroll, Performance, Salary Management |
  | **AEGIS** | SSO, MFA, Users, JWT | API Keys, Bot Detection, RBAC | SCIM, FastPass, AI Agent Identity |
  | **VISTA** | Dashboards, Charts, Filters, Real-time KPIs | Drag & Drop, Export, Custom SQL | Tableau Agent, Tableau Next, ETL |

  ---

  ## 13. BUILD ORDER RECOMMENDATION

  For maximum impact with 10 AI agents working in parallel:

  | Week | Apps | Rationale |
  |------|------|-----------|
  | **Week 1** | AEGIS + CINQ | Foundation + Revenue path |
  | **Week 2** | DIAL + PIVOT | Engagement + Collaboration |
  | **Week 3** | SPARK + TEMPO + SOND | Automation + Productivity |
  | **Week 4** | VAULT + PAUSE + VISTA | Complements (can be simpler in v1) |

  Each agent can build one complete app following the P0 feature list above. P1 features can wait for v1.1.

  ---

  ## 14. THE ATAQU DIFFERENTIATOR (Why We Win)

  | Competitor | Their MoaT | Our Counter-Strategy |
  |------------|------------|---------------------|
  | **HubSpot** | AI + Ecosystem | Price ($49/mo vs $1,200/mo) + No lock-in + Native integration + JSONB with graceful degradation + Compile‑time PII safety (redacting newtypes, no `Serialize`) |
  | **Slack** | Ubiquity | No per-user fees + Unified chat/support + Native CRM integration |
  | **Notion** | Flexibility | Sub-15ms search + Native relations to CRM/Inventory |
  | **Zapier** | 9,000+ apps | No task limits + <1s execution + Native to our 10 apps |
  | **Calendly** | Simplicity | No per-user fees + Native CRM activity creation + Timely no-show detection |
  | **Typeform** | UX | No response limits + Native CRM lead creation |
  | **Cin7** | Depth | No AI bloat + Native CRM order integration |
  | **Personio** | Compliance | No payroll complexity + Native AEGIS deprovisioning |
  | **Okta** | Enterprise | No per-user fees + Built into the OS |
  | **Tableau** | Visual power | No ETL + Native real-time data from all apps |

  ---

  **Document prepared for Ataqu Architecture Team. Ready for AI agent implementation.**
