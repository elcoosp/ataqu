/**
 * Deterministic seed for the mock database — the "Lumen Robotics" demo
 * company. Run once per page load by `mocks/index.ts` before the MSW worker
 * starts handling requests.
 *
 * Everything is relative to `Date.now()`: bookings land today/this week,
 * movements span the last 30 days, deals progress through the pipeline — so
 * screenshots taken any day look like a living business.
 */
import {
        ADMIN_ID,
        audit,
        dateOnly,
        db,
        daysAgo,
        hoursAgo,
        hoursFromNow,
        nextId,
        now,
        pick,
        ri,
        rnd,
        TENANT_ID,
} from "./db";
import type {
	MockActivity,
	MockBooking,
	MockChannel,
	MockForm,
	MockFormQuestion,
	MockLeave,
	MockRun,
	MockTicket,
	MockWorkflow,
} from "./db";

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

const USERS: Array<[string, string, string, string]> = [
        // [id, name, email, role]
        [ADMIN_ID, "Dana Whitfield", "demo@ataqu.com", "admin"],
        ["usr-002", "Marcus Chen", "marcus@lumenrobotics.io", "admin"],
        ["usr-003", "Priya Natarajan", "priya@lumenrobotics.io", "editor"],
        ["usr-004", "Tomás Ferreira", "tomas@lumenrobotics.io", "editor"],
        ["usr-005", "Ingrid Solberg", "ingrid@lumenrobotics.io", "editor"],
        ["usr-006", "Jamal Carter", "jamal@lumenrobotics.io", "viewer"],
        ["usr-007", "Sofia Marchetti", "sofia@lumenrobotics.io", "editor"],
        ["usr-008", "Kenji Nakamura", "kenji@lumenrobotics.io", "viewer"],
];

const CONTACT_COMPANIES = [
        "Northwind Logistics", "Helios Energy", "Bluepeak Manufacturing",
        "Ardent Foods", "Vantage Retail Group", "Cobalt Mining Co.",
        "Meridian Health", "Silverbirch Robotics", "Atlas Freight",
        "Kestrel Aerospace", "Juniper Farms", "Redwood Analytics",
        "Pinnacle Construction", "Zephyr Marine", "Cranfield University",
        "Ironclad Security", "Lakeshore Resorts", "Quantum Materials",
        "Evergreen Utilities", "Sable Automotive", "Tessellate AI",
        "Harborview Ports", "Summit Peak Gear", "Novagen Biotech",
];

const CONTACT_NAMES = [
        "Amara Okafor", "Felix Wagner", "Léa Moreau", "Diego Herrera",
        "Hannah Kim", "Oliver Bennett", "Fatima Al-Rashid", "Jonas Lindqvist",
        "Camille Dubois", "Ravi Patel", "Emma Johansson", "Lucas Meyer",
        "Isabella Ricci", "Noah Williams", "Yuki Tanaka", "Marta Kowalska",
        "Sébastien Girard", "Chloe Adams", "Ibrahim Diallo", "Anna Berg",
        "Viktor Hansen", "Renata Silva", "Ethan Brooks", "Maya Krishnan",
];

const DEAL_TITLES = [
        "Atlas Fleet rollout (12 units)", "Warehouse automation pilot", "Q3 AMR fleet expansion",
        "Pick-and-place line retrofit", "Cold-storage AMR deployment", "Assembly cobot integration",
        "Inventory drones phase 2", "Fulfillment center audit bots", "Lab automation suite",
        "Ports inspection drones", "Retail restock robots", "Hospital logistics AMRs",
        "Construction site mapping", "Agriculture scouting fleet", "Security patrol bots",
        "Cross-dock conveyance retrofit", "Electronics kitting cells", "Airport baggage bots",
];

export function seed() {
        seedAegis();
        seedCinq();
        seedDial();
        seedPivot();
        seedSpark();
        seedTempo();
        seedSond();
        seedVault();
        seedPause();
        seedVista();
        seedPlatform();
}

// ---------------------------------------------------------------------------
// AEGIS
// ---------------------------------------------------------------------------

function seedAegis() {
        for (const [id, name, email, role] of USERS) {
                db.users.push({
                        id,
                        email,
                        name,
                        password: "demo1234",
                        version: ri(2, 9),
                        role,
                        is_active: id !== "usr-008" ? true : ri(0, 4) > 0, // keep almost everyone active
                        mfa_enabled: id === ADMIN_ID || id === "usr-002",
                        last_login_at: hoursAgo(ri(1, 72)),
                        created_at: daysAgo(ri(120, 400)),
                });
        }

        db.roles.push(
                { id: "rol-001", name: "Administrator", permissions: ["*"], created_at: daysAgo(380) },
                {
                        id: "rol-002", name: "Operations", permissions: ["cinq:editor", "vault:editor", "dial:editor", "vista:viewer"],
                        created_at: daysAgo(360),
                },
                {
                        id: "rol-003", name: "People Ops", permissions: ["pause:admin", "vista:viewer"],
                        created_at: daysAgo(300),
                },
                {
                        id: "rol-004", name: "Read-only", permissions: ["cinq:viewer", "dial:viewer", "vault:viewer", "vista:viewer"],
                        created_at: daysAgo(210),
                },
        );

        const appList = ["cinq", "dial", "pivot", "spark", "tempo", "sond", "vault", "pause", "vista"];
        for (const u of db.users) {
                const roles: Record<string, "admin" | "editor" | "viewer" | "none"> = {};
                for (const app of appList) {
                        roles[app] =
                                u.role === "admin" ? "admin" : u.role === "viewer" ? "viewer" : pick(["editor", "editor", "viewer"] as const);
                }
                db.permissions.push({ user_id: u.id, user_name: u.name, user_email: u.email, roles });
        }

        const keyNames: Array<[string, string[]]> = [
                ["ci-deploy", ["read", "write"]],
                ["shopify-bridge", ["read", "write"]],
                ["grafana-metrics", ["read"]],
                ["support-macros", ["read"]],
                ["warehouse-scanner", ["read", "write"]],
                ["backup-job", ["admin"]],
        ];
        for (const [name, scopes] of keyNames) {
                db.apiKeys.push({
                        id: nextId("key"),
                        name,
                        prefix: `ak_${name.slice(0, 4)}${ri(10, 99)}`,
                        scopes,
                        created_at: daysAgo(ri(10, 200)),
                        last_used_at: hoursAgo(ri(1, 96)),
                });
        }

        const actions: Array<[string, string, string]> = [
                ["login", "aegis", "session"], ["contact.create", "cinq", "contact"],
                ["deal.update", "cinq", "deal"], ["product.stock_adjust", "vault", "variant"],
                ["workflow.toggle", "spark", "workflow"], ["employee.update", "pause", "employee"],
                ["form.publish", "sond", "form"], ["dashboard.update", "vista", "dashboard"],
                ["apikey.create", "aegis", "api_key"], ["leave.approve", "pause", "leave_request"],
                ["channel.create", "dial", "channel"], ["document.update", "pivot", "document"],
        ];
        for (let i = 0; i < 48; i++) {
                const [action, app, entityType] = pick(actions);
                audit(
                        pick(USERS)[0],
                        action,
                        app,
                        entityType,
                        undefined,
                        { source: "seed" },
                );
                // audit() unshifts with sequential ids; keep newest-first ordering.
                db.audit[0].created_at = hoursAgo(i * 3 + 1);
        }
        db.audit.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
        db.audit.forEach((entry, i) => (entry.id = i + 1));

        db.tenant.userCount = db.users.length;
        db.tenant.apiKeyCount = db.apiKeys.length;
}

// ---------------------------------------------------------------------------
// CINQ
// ---------------------------------------------------------------------------

function seedCinq() {
        const stageNames = ["Prospect", "Qualified", "Proposal", "Negotiation", "Closed"];
        stageNames.forEach((name, i) =>
                db.stages.push({ id: `stg-00${i + 1}`, name, order: i + 1, version: 1 }),
        );

        CONTACT_NAMES.forEach((name, i) => {
                const company = CONTACT_COMPANIES[i % CONTACT_COMPANIES.length];
                db.contacts.push({
                        id: `cnt-${String(i + 1).padStart(3, "0")}`,
                        name,
                        email: `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@${company.toLowerCase().replace(/[^a-z]+/g, "")}.com`,
                        company,
                        phone: `+33 6 ${ri(10, 99)} ${ri(10, 99)} ${ri(10, 99)} ${ri(10, 99)}`,
                        lead_score: ri(20, 98),
                        custom_fields: {
                                industry: pick(["logistics", "manufacturing", "energy", "healthcare", "retail"]),
                                seats: ri(20, 2000),
                                region: pick(["EMEA", "NA", "APAC"]),
                        },
                        created_at: daysAgo(ri(30, 300)),
                        updated_at: daysAgo(ri(0, 20)),
                        version: ri(1, 6),
                });
        });

        DEAL_TITLES.forEach((title, i) => {
                const status = i % 7 === 0 ? "won" : i % 11 === 0 ? "lost" : "open";
                const stage = status === "won" ? db.stages[4] : status === "lost" ? db.stages[ri(2, 3)] : db.stages[Math.min(3, Math.floor(i / 5))];
                db.deals.push({
                        id: `dl-${String(i + 1).padStart(3, "0")}`,
                        title,
                        amount: ri(18, 240) * 1000,
                        status,
                        contact_id: pick(db.contacts).id,
                        pipeline_stage_id: stage.id,
                        owner_id: pick(USERS.slice(0, 6))[0],
                        probability: status === "won" ? 100 : status === "lost" ? 0 : ri(15, 85),
                        quantity: ri(1, 14),
                        created_at: daysAgo(ri(14, 180)),
                        updated_at: daysAgo(ri(0, 9)),
                        version: ri(1, 8),
                });
        });

        const activityTemplates: Array<[MockActivity["activity_type"], string]> = [
                ["call", "Discovery call — walked through the AMR fleet pricing"],
                ["email", "Sent follow-up deck with ROI projections"],
                ["meeting", "On-site walkthrough of fulfillment center"],
                ["note", "Procurement confirmed budget envelope for Q4"],
                ["task", "Prepare security questionnaire response"],
                ["call", "Technical deep-dive with ops team"],
                ["email", "Shared reference customer case study"],
                ["meeting", "Executive sponsor intro — CFO joined"],
        ];
        for (let i = 0; i < 46; i++) {
                const [activity_type, description] = pick(activityTemplates);
                const deal = pick(db.deals);
                db.activities.push({
                        id: nextId("act"),
                        activity_type,
                        description,
                        scheduled_at: ri(0, 1) ? hoursAgo(ri(2, 500)) : hoursFromNow(ri(2, 200)),
                        contact_id: deal.contact_id,
                        deal_id: deal.id,
                        created_at: daysAgo(ri(0, 40)),
                });
        }

        const taskTitles = [
                "Send revised quote", "Book technical workshop", "Prepare pilot success criteria",
                "Follow up on legal review", "Confirm delivery windows", "Draft MSA redlines",
                "Schedule site survey", "Collect fleet telemetry requirements",
        ];
        for (let i = 0; i < 16; i++) {
                const deal = pick(db.deals);
                db.tasks.push({
                        id: `tsk-${String(i + 1).padStart(3, "0")}`,
                        title: pick(taskTitles),
                        description: ri(0, 1) ? "Owner asked for a refreshed timeline before signature." : undefined,
                        due_date: ri(0, 1) ? hoursFromNow(ri(12, 240)) : daysAgo(ri(1, 10)),
                        status: i % 4 === 0 ? "completed" : "pending",
                        contact_id: deal.contact_id,
                        deal_id: deal.id,
                        assigned_to: pick(USERS.slice(0, 6))[0],
                        created_at: daysAgo(ri(2, 30)),
                        updated_at: daysAgo(ri(0, 4)),
                        version: 1,
                });
        }

        const establishments: Array<[string, string, string]> = [
                ["Northwind Logistics SAS", "812 456 789 00021", "12 Quai de la Rapée, 75012 Paris"],
                ["Helios Energy GmbH", "301 552 918 00044", "Sonnenallee 3, 10179 Berlin"],
                ["Bluepeak Manufacturing Ltd", "229 640 118 00017", "4 Foundry Rd, Birmingham B12 0JS"],
                ["Ardent Foods SA", "553 021 447 00038", "Polígono La Vega, 31160 Castellón"],
                ["Vantage Retail Group", "880 214 665 00012", "300 Market St, San Francisco, CA"],
                ["Meridian Health N.V.", "775 903 221 00029", "Medisch Centrum 8, 3015 Rotterdam"],
        ];
        for (const [company_name, siret, address] of establishments) {
                db.establishments.push({
                        id: nextId("est"),
                        company_name,
                        siret,
                        address,
                        created_at: daysAgo(ri(40, 300)),
                        updated_at: daysAgo(ri(0, 30)),
                });
        }

        const trackTypes = ["send", "deliver", "open", "open", "click", "bounce"] as const;
        for (let i = 0; i < 30; i++) {
                db.tracking.push({
                        id: nextId("trk"),
                        contact_id: pick(db.contacts).id,
                        event_type: pick(trackTypes),
                        metadata: { campaign: pick(["q3-outreach", "fleet-launch", "webinar-invite"]) },
                        created_at: hoursAgo(ri(1, 600)),
                });
        }
}

// ---------------------------------------------------------------------------
// DIAL
// ---------------------------------------------------------------------------

function seedDial() {
        const channelDefs: Array<[string, MockChannel["channel_type"], string[]]> = [
                ["general", "public", [ADMIN_ID, "usr-002", "usr-003", "usr-004", "usr-005", "usr-006", "usr-007"]],
                ["support", "public", [ADMIN_ID, "usr-004", "usr-006", "usr-007"]],
                ["engineering", "public", [ADMIN_ID, "usr-002", "usr-003", "usr-005"]],
                ["sales-war-room", "private", [ADMIN_ID, "usr-004", "usr-005"]],
                ["ops-warehouse-2", "private", [ADMIN_ID, "usr-005", "usr-007"]],
                ["Dana · Marcus", "direct_message", [ADMIN_ID, "usr-002"]],
                ["Dana · Ingrid", "direct_message", [ADMIN_ID, "usr-005"]],
                ["Priya · Tomás", "direct_message", ["usr-003", "usr-004"]],
        ];
        for (const [name, channel_type, participants] of channelDefs) {
                db.channels.push({
                        id: nextId("chn"),
                        name,
                        channel_type,
                        version: ri(1, 4),
                        created_by: ADMIN_ID,
                        participants,
                        unread_count: name === "general" ? 3 : name === "support" ? 5 : ri(0, 2),
                        created_at: daysAgo(ri(30, 200)),
                        updated_at: hoursAgo(ri(0, 20)),
                        archived_at: null,
                });
        }

        const convos: Record<string, string[]> = {
                general: [
                        "Morning all — fleet telemetry dashboards are live in VISTA.",
                        "Nice. The Atlas Freight pilot wrapped yesterday, 12/12 units green.",
                        "We should templatize that rollout checklist in PIVOT.",
                        "On it. Draft is up: 'Fleet rollout playbook v2'.",
                        "Reminder: quarterly business review is Thursday 14:00 CET.",
                        "I'll present the automation metrics — pulling numbers from the SPARK runs.",
                        "Heads up: warehouse scanner firmware 4.2 ships Friday.",
                        "Change log entry is drafted, will publish after the release.",
                ],
                support: [
                        "Ticket #3 escalated — Northwind's dock AMR is throwing E-217 on boot.",
                        "Logs look like a lidar calibration drift. Sending the recalibration runbook.",
                        "Customer confirmed recalibration fixed it. Closing after 24h soak.",
                        "Two new tickets from Ardent Foods, both low priority.",
                        "CSAT for September came in at 96%.",
                ],
                engineering: [
                        "Spark workflow 'low-stock → purchase order' failed twice overnight, DLQ replayed fine.",
                        "Root cause: vendor API timeout. Bumping retry backoff to 30s.",
                        "Plate editor collab polish is in review.",
                        "The vista data-points cache warm-up takes 40s after deploy — acceptable?",
                        "Fine for now, flagging in the runbook.",
                ],
                "sales-war-room": [
                        "Helios Energy verbal yes on phase 2 — €310k ARR.",
                        "Huge. Let me update the deal stage and loop in finance.",
                        "Meridian Health asked for a 30-unit proposal by Friday.",
                        "Building it now — reusing the Atlas pricing structure.",
                ],
                "ops-warehouse-2": [
                        "Cycle count variance is down to 0.4% this week.",
                        "Reservations look clean after the stock sync.",
                        "Amazon reconciliation finished, 3 mismatches logged.",
                ],
                "Dana · Marcus": [
                        "Can you review the SSO rollout plan before the board meeting?",
                        "Reading now — the aegis migration steps look solid.",
                        "Thanks. I'll present Thursday.",
                        "One flag: IP allowlist changes should require MFA re-verification.",
                        "Agreed, I'll add that to the plan.",
                ],
                "Dana · Ingrid": [
                        "Warehouse 2 onboarding is done — both hires completed paperwork.",
                        "Great. Leave approvals are caught up too.",
                ],
                "Priya · Tomás": [
                        "The conditional logic modal needs one more edge case for multi-select.",
                        "Pushing a fix tonight, can you re-check the preview flow tomorrow?",
                ],
        };

        for (const channel of db.channels) {
                const lines = convos[channel.name] ?? convos.general;
                const participants = channel.participants;
                lines.forEach((content, i) => {
                        db.messages.push({
                                id: nextId("msg"),
                                channel_id: channel.id,
                                author_id: participants[i % participants.length],
                                version: 1,
                                content,
                                sent_at: hoursAgo((lines.length - i) * 2 + ri(0, 1)),
                                thread_id: null,
                                edited_at: null,
                                deleted_at: null,
                        });
                });
        }

        // A couple of threads + reactions + mentions for richness
        const general = db.channels.find((c) => c.name === "general")!;
        const generalMsgs = db.messages.filter((m) => m.channel_id === general.id);
        db.threads.push({
                id: nextId("thr"),
                channel_id: general.id,
                parent_message_id: generalMsgs[1].id,
                created_at: hoursAgo(30),
        });
        db.messages.push(
                {
                        id: nextId("msg"), channel_id: general.id, author_id: "usr-005", version: 1,
                        content: "Template started — will link the checklist blocks.",
                        sent_at: hoursAgo(28), thread_id: db.threads[0].id, edited_at: null, deleted_at: null,
                },
                {
                        id: nextId("msg"), channel_id: general.id, author_id: "usr-003", version: 1,
                        content: "Added the safety sign-off section.",
                        sent_at: hoursAgo(27), thread_id: db.threads[0].id, edited_at: null, deleted_at: null,
                },
        );
        for (const [emoji, msgIdx, userId] of [["✅", 0, "usr-002"], ["🚀", 0, "usr-004"], ["👀", 2, "usr-006"]] as const) {
                db.reactions.push({
                        id: nextId("rct"),
                        message_id: generalMsgs[msgIdx as number].id,
                        user_id: userId,
                        emoji,
                        created_at: hoursAgo(ri(2, 20)),
                });
        }
        db.mentions.push({
                id: nextId("mnt"),
                message_id: generalMsgs[3].id,
                user_id: ADMIN_ID,
                read_at: null,
        });

        const ticketDefs: Array<[string, MockTicket["status"], MockTicket["priority"], string, string]> = [
                ["Dock AMR throws E-217 on boot", "open", "urgent", "Amara Okafor", "amara.okafor@northwindlogistics.com"],
                ["Lidar recalibration request — Bay 4", "pending", "high", "Felix Wagner", "felix.wagner@heliosenergy.com"],
                ["Firmware 4.1 update loop", "resolved", "high", "Léa Moreau", "lea.moreau@bluepeak.com"],
                ["Request: extra battery packs for night shift", "open", "medium", "Diego Herrera", "diego.herrera@ardentfoods.com"],
                ["Dashboard export missing CSV option", "open", "low", "Hannah Kim", "hannah.kim@vantage.com"],
                ["AMR stuck at charging dock 7", "pending", "urgent", "Oliver Bennett", "oliver.bennett@cobalt.com"],
                ["SSO login fails after password reset", "resolved", "high", "Ravi Patel", "ravi.patel@meridianhealth.com"],
                ["Add barcode scanner profiles", "closed", "medium", "Emma Johansson", "emma.johansson@atlasfreight.com"],
                ["Telemetry gap between 02:00-03:00 UTC", "open", "medium", "Lucas Meyer", "lucas.meyer@kestrel.io"],
                ["Training videos for new operators", "closed", "low", "Marta Kowalska", "marta.k@juniperfarms.com"],
        ];
        for (const [subject, status, priority, requester_name, requester_email] of ticketDefs) {
                const id = nextId("tkt");
                db.tickets.push({
                        id,
                        subject,
                        status,
                        priority,
                        requester_name,
                        requester_email,
                        assignee_id: pick([ADMIN_ID, "usr-004", "usr-007"]),
                        last_message: null,
                        last_message_at: hoursAgo(ri(1, 72)),
                        created_at: daysAgo(ri(1, 30)),
                        updated_at: hoursAgo(ri(1, 48)),
                });
                const msgs: Array<[boolean, string]> = [
                        [true, `${subject}. It started this morning, attached diagnostics from the unit.`],
                        [false, "Thanks — pulling the logs now. Can you confirm firmware version on the unit?"],
                        [true, "Version 4.1.6, and it happened right after the dock cycle."],
                        [false, "Got it. Applying the mitigation steps, will update within the hour."],
                ];
                msgs.forEach(([from_customer, content], i) => {
                        db.ticketMessages.push({
                                id: nextId("tmsg"),
                                ticket_id: id,
                                from_customer,
                                content,
                                created_at: hoursAgo(40 - i * 6),
                        });
                });
                const last = db.ticketMessages[db.ticketMessages.length - 1];
                db.tickets.find((t) => t.id === id)!.last_message = last.content.slice(0, 80);
        }
}

// ---------------------------------------------------------------------------
// PIVOT
// ---------------------------------------------------------------------------

function seedPivot() {
        const docs: Array<[string, string]> = [
                ["Fleet rollout playbook v2", `# Fleet rollout playbook v2

## 1. Pre-deployment
- Confirm site survey is signed off
- Validate dock power + network coverage
- Import operator roster into PAUSE

## 2. Deployment day
1. Stage units in receiving bay
2. Run firmware 4.2 flash
3. Execute calibration workflow (SPARK: \`fleet-calibration\`)
4. Smoke test: 3 full pick cycles

## 3. Handover
- Operator training (2 sessions)
- Support channel created in DIAL
- Success criteria doc shared with champion`],
                ["Q4 OKRs — Operations", `# Q4 OKRs — Operations

## Objective: Ship the Atlas expansion without SLA regressions
- **KR1** 98% fleet uptime across all customer sites
- **KR2** Median support first-response < 25 min
- **KR3** Zero P1 incidents during rollout windows

## Objective: Make warehouse ops boring (in a good way)
- **KR1** Cycle count variance < 0.5%
- **KR2** Stock adjustments fully migrated off spreadsheets`],
                ["Vendor API runbook", `# Vendor API runbook

The supplier portal API rate-limits aggressively.

| Symptom | Cause | Fix |
|---|---|---|
| 429 bursts | shared token pool | raise backoff to 30s |
| timeouts 02:00 UTC | their batch window | retry after 15 min |
| stale stock | webhook lag | force sync from VAULT |

Escalation: vendor-ops@supplier.example — reference contract \`SRV-2211\`.`],
                ["Interview loop — Field Engineer", `# Interview loop — Field Engineer

1. **Screen** (30 min) — logistics background, travel appetite
2. **Technical** (60 min) — fleet diagnostics case study
3. **Values** (45 min) — customer obsession examples
4. **Debrief** — same day, scorecard in PIVOT

Bar-raiser question: "Walk me through a time you said no to a customer request — and why."`],
                ["Security whitepaper — AMR data flow", `# Security whitepaper — AMR data flow

All telemetry flows through the customer's regional gateway before reaching our cloud. PII never leaves the tenant boundary; the Rust backend redacts emails/phones at the serializer layer (see \`ataqu-security\`).

**Compliance:** SOC2 Type II, GDPR — DPA on file, EU data residency available.`],
                ["Pricing committee notes — Sept", `# Pricing committee notes — Sept

- AMR hardware margin holding at 41%
- Software attach rate: 78% of deals include the ops suite
- Decision: hold list pricing, add volume band at 15+ units
- Next review: after Atlas expansion closes`],
                ["Customer onboarding checklist", `# Customer onboarding checklist

- [ ] SSO connection configured (AEGIS)
- [ ] Operator accounts provisioned
- [ ] Warehouse map imported
- [ ] Calibration workflow scheduled
- [ ] Support channel created + intros posted
- [ ] Executive sponsor pinged at go-live`],
                ["Incident postmortem — 2026-09-28", `# Incident postmortem — 2026-09-28

**Impact:** Telemetry gap for 14 customers, 62 minutes.

**Root cause:** Outbox dispatcher stalled behind a long-running migration lock.

**Action items**
1. Migration job runs in off-peak window — done
2. Dispatcher watchdog + auto-restart — shipped
3. Add outbox lag to the health pill — shipped`],
                ["Competitive brief — warehouse automation", `# Competitive brief — warehouse automation

| Player | Strength | Our edge |
|---|---|---|
| BigRobotics | Install base | native suite integration |
| PickCorp | Price | TCO incl. software |
| Startup-X | Speed | reliability record |`],
                ["Board update — draft", `# Board update — draft

Revenue grew 18% QoQ, driven by the automation suite attach. Support CSAT 96%. Key risk: supply chain lead times on lidar units — dual-sourcing started.`],
                ["Design system — workspace guidelines", `# Design system — workspace guidelines

Dark-first, amber accent, hairline borders. Every table row 40px. Motion answers the hand at 150ms. If it needs a shadow to be readable, the contrast is wrong.`],
                ["Field replaceable units list", `# Field replaceable units list

1. Lidar pod (SKU LID-42)
2. Drive module (SKU DRV-07)
3. Battery pack 48V (SKU BAT-48V)
4. Compute cartridge (SKU CMP-3A)

Each FRU ships with a calibration cert; register swaps in VAULT movements.`],
        ];
        for (const [title, content] of docs) {
                const id = nextId("doc");
                const created = daysAgo(ri(30, 180));
                db.documents.push({
                        id,
                        title,
                        content,
                        created_at: created,
                        updated_at: daysAgo(ri(0, 12)),
                        version: ri(2, 7),
                });
                // Version history: 2-3 prior snapshots per doc
                const versions = db.documents[db.documents.length - 1].version;
                for (let v = 1; v < Math.min(versions, 4); v++) {
                        db.docVersions.push({
                                id: nextId("dvr"),
                                document_id: id,
                                title,
                                content: `${content}\n\n<!-- revision ${v} -->`,
                                version: v,
                                created_at: daysAgo(ri(10, 40) + (4 - v) * 7),
                        });
                }
        }

        const dbs: Array<[string, string, Array<[string, string, number, string]>]> = [
                ["Equipment registry", "inventory", [
                        ["Lidar pod", "LID-42", 419900, "In stock"],
                        ["Drive module", "DRV-07", 128500, "In stock"],
                        ["Battery pack 48V", "BAT-48V", 89900, "Low"],
                        ["Compute cartridge", "CMP-3A", 210000, "In stock"],
                        ["Charging dock", "DCK-01", 64500, "In stock"],
                        ["Sensor mast", "MST-12", 47500, "Reorder"],
                ]],
                ["Pilot tracker", "projects", [
                        ["Atlas Freight", "Phase 2", 62, "On track"],
                        ["Helios Energy", "Pilot", 31, "On track"],
                        ["Meridian Health", "Proposal", 8, "At risk"],
                        ["Ardent Foods", "Deployment", 77, "On track"],
                        ["Vantage Retail", "Discovery", 12, "On track"],
                ]],
                ["Site directory", "operations", [
                        ["Paris — Dock 3", "Warehouse", 14500, "Active"],
                        ["Hamburg — Hafen Nord", "Warehouse", 22000, "Active"],
                        ["Birmingham — Unit 4", "Factory", 9800, "Active"],
                        ["Rotterdam — Medisch", "Hospital", 3200, "Active"],
                ]],
        ];
        for (const [name, kind, rows] of dbs) {
                const dbId = nextId("pdb");
                db.databases.push({ id: dbId, name, created_at: daysAgo(ri(30, 120)) });
                rows.forEach(([itemName, code, num, status], i) => {
                        db.databaseRows.push({
                                id: nextId("row"),
                                database_id: dbId,
                                data: {
                                        Name: itemName,
                                        Code: code,
                                        Amount: num,
                                        Status: status,
                                        "Sort key": i,
                                },
                                created_at: daysAgo(ri(1, 60)),
                        });
                });
        }

        // Blocks + relations for the main docs
        const playbook = db.documents.find((d) => d.title.includes("playbook"))!;
        db.blocks.push(
                {
                        id: nextId("blk"), document_id: playbook.id, block_type: "markdown",
                        content: { markdown: "## 4. Post-deployment\n\nFirst 14 days: daily fleet health digest auto-posted to the customer support channel." },
                        created_at: daysAgo(20), updated_at: daysAgo(4), version: 3,
                },
                {
                        id: nextId("blk"), document_id: playbook.id, block_type: "checklist",
                        content: { items: ["Site survey signed", "Dock power validated", "Roster imported", "Calibration run"] },
                        created_at: daysAgo(20), updated_at: daysAgo(4), version: 2,
                },
        );
        db.relations.push({
                id: nextId("rel"),
                from_block_id: db.blocks[0].id,
                to_block_id: db.blocks[1].id,
                relation_type: "references",
        });

        for (const [name, content] of [
                ["Meeting notes", "# Meeting notes\n\n**Attendees:** …\n\n## Decisions\n- …"],
                ["Postmortem template", "# Incident postmortem\n\n**Impact:**\n**Root cause:**\n**Action items:**"],
                ["RFC template", "# RFC: <title>\n\n## Context\n## Proposal\n## Risks"],
                ["One-pager", "# <Customer> one-pager\n\n**Problem:**\n**Solution:**\n**Commercial:**"],
                ["Weekly ops digest", "# Ops digest — <week>\n\nUptime, tickets, stock alerts, hiring."],
        ]) {
                db.templates.push({ id: nextId("tpl"), name, content, created_at: daysAgo(ri(30, 100)) });
        }
}

// ---------------------------------------------------------------------------
// SPARK
// ---------------------------------------------------------------------------

function seedSpark() {
        const workflows: Array<[string, MockWorkflow["trigger"], MockWorkflow["conditions"], MockWorkflow["actions"], boolean]> = [
                ["Low stock → purchase draft",
                        { type: "event", event_type: "vault.low_stock" },
                        [{ type: "field_less_than", field: "stock_quantity", value: 6 }],
                        [{ type: "send_email", to: "procurement@lumenrobotics.io", subject: "Low stock alert", body: "A variant dropped below threshold — draft a PO in the supplier portal." }],
                        true],
                ["Deal won → war room",
                        { type: "event", event_type: "cinq.deal_won" },
                        [{ type: "field_greater_than", field: "amount", value: 100000 }],
                        [{ type: "create_dial_channel", name: "deal-won-{{deal_id}}", channel_type: "private", participants: [ADMIN_ID, "usr-004"] },
                                { type: "send_dial_message", channel_id: "chn-004", content: "New enterprise win — let's plan the rollout." }],
                        true],
                ["Nightly fleet telemetry digest",
                        { type: "schedule", cron: "0 2 * * *" },
                        [],
                        [{ type: "webhook", url: "https://ops.lumenrobotics.io/hooks/digest", method: "POST", body: { window: "24h" }, headers: { "x-api-key": "***" } }],
                        true],
                ["NDA received → contact enrich",
                        { type: "webhook", path: "nda-received" },
                        [{ type: "field_exists", field: "company" }],
                        [{ type: "create_cinq_contact", name: "{{name}}", email: "{{email}}" },
                                { type: "create_cinq_activity", contact_id: "cnt-001", activity_type: "note", description: "Auto-created from NDA webhook" }],
                        true],
                ["Pilot kickoff approval",
                        { type: "event", event_type: "cinq.deal_stage_changed" },
                        [{ type: "field_equals", field: "stage", value: "Negotiation" }],
                        [{ type: "request_approval", approver_role: "admin" }],
                        true],
                ["Reservation spike → restock",
                        { type: "event", event_type: "vault.reserved" },
                        [{ type: "field_greater_than", field: "reserved_quantity", value: 20 }],
                        [{ type: "adjust_vault_stock", variant_id: "var-003", delta: 50, reason: "Auto restock from reservation spike" }],
                        true],
                ["Inbound lead router",
                        { type: "webhook", path: "inbound-lead" },
                        [{ type: "field_contains", field: "email", value: "@" }],
                        [{ type: "create_cinq_lead", name: "{{name}}", email: "{{email}}", source: "webhook" }],
                        false],
                ["Leave approved → calendar hold",
                        { type: "event", event_type: "pause.leave_approved" },
                        [],
                        [{ type: "update_record", table: "tempo_bookings", record_id: "{{booking_id}}", fields: "status=confirmed" }],
                        true],
        ];
        for (const [name, trigger, conditions, actions, is_active] of workflows) {
                db.workflows.push({
                        id: nextId("wf"),
                        name,
                        trigger,
                        conditions,
                        actions,
                        is_active,
                        webhook_secret: trigger.type === "webhook" ? `whsec_${ri(10 ** 5, 10 ** 6)}` : undefined,
                        created_at: daysAgo(ri(30, 160)),
                        updated_at: daysAgo(ri(0, 14)),
                        version: ri(1, 9),
                });
        }

        const runStatuses: MockRun["status"][] = ["completed", "completed", "completed", "failed", "running", "pending_approval", "approved", "rejected"];
        for (let i = 0; i < 26; i++) {
                const wf = pick(db.workflows);
                const status = i < 3 ? "running" : i < 6 ? "pending_approval" : pick(runStatuses);
                db.runs.push({
                        id: nextId("run"),
                        workflow_id: wf.id,
                        status,
                        payload: { source: pick(["telemetry", "webhook", "schedule", "manual"]), entity_id: nextId("ent"), simulated: true },
                        created_at: hoursAgo(i * 4 + ri(0, 3)),
                        updated_at: hoursAgo(ri(0, 2)),
                });
        }

        for (let i = 0; i < 5; i++) {
                db.dlq.push({
                        id: nextId("dlq"),
                        event_type: pick(["vault.low_stock", "cinq.deal_won", "vendor.sync", "email.bounce", "dial.presence"]),
                        payload: { attempt: i + 1, entity: nextId("ent") },
                        error: pick([
                                "vendor API timeout after 3 retries (ECONNRESET)",
                                "schema validation failed: expected number, got string",
                                "upstream 503 during maintenance window",
                                "webhook signature mismatch",
                                "destination channel archived",
                        ]),
                        attempts: ri(2, 5),
                        created_at: daysAgo(ri(0, 10)),
                });
        }

        db.pendingApprovals.push(
                {
                        id: nextId("apv"), tenant_id: TENANT_ID,
                        workflow_id: db.workflows[4].id, run_id: db.runs[4].id,
                        approver_role: "admin", status: "pending", created_at: hoursAgo(9),
                },
                {
                        id: nextId("apv"), tenant_id: TENANT_ID,
                        workflow_id: db.workflows[4].id, run_id: db.runs[5].id,
                        approver_role: "admin", status: "pending", created_at: hoursAgo(31),
                },
        );
}

// ---------------------------------------------------------------------------
// TEMPO
// ---------------------------------------------------------------------------

function seedTempo() {
        const eventTypes: Array<[string, string, string, number]> = [
                ["Discovery call", "discovery-call", "30-minute intro to the automation suite", 30],
                ["Technical deep-dive", "technical-deep-dive", "Architecture + integration review with our engineers", 60],
                ["Site walkthrough", "site-walkthrough", "On-site fleet assessment", 90],
                ["Quarterly business review", "qbr", "Success review with executive sponsors", 45],
        ];
        for (const [name, slug, description, duration_minutes] of eventTypes) {
                db.eventTypes.push({
                        id: nextId("evt"),
                        tenant_id: TENANT_ID,
                        name,
                        slug,
                        description,
                        duration_minutes,
                        is_active: true,
                        created_at: daysAgo(ri(60, 200)),
                        updated_at: daysAgo(ri(0, 20)),
                        version: ri(1, 5),
                });
        }

        // Availability: next 12 weekdays, 09:00–17:00 in 60-min slots, for the
        // discovery-call + deep-dive event types.
        for (const et of db.eventTypes.slice(0, 2)) {
                for (let d = 0; d < 14; d++) {
                        const day = new Date(now() + d * 86_400_000);
                        const dow = day.getUTCDay();
                        if (dow === 0 || dow === 6) continue;
                        for (let hour = 9; hour < 17; hour += 1) {
                                const start = new Date(day);
                                start.setUTCHours(hour, 0, 0, 0);
                                if (start.getTime() < now()) continue;
                                const booked = ri(0, 9) === 0;
                                db.slots.push({
                                        id: nextId("slt"),
                                        event_type_id: et.id,
                                        start_time: start.toISOString(),
                                        end_time: new Date(start.getTime() + et.duration_minutes * 60_000).toISOString(),
                                        is_booked: booked,
                                });
                        }
                }
        }

        const bookingStatuses: MockBooking["status"][] = ["confirmed", "completed", "pending", "no_show", "cancelled"];
        const people = db.contacts.slice(0, 10);
        people.forEach((person, i) => {
                const et = db.eventTypes[i % db.eventTypes.length];
                const status = i < 3 ? "confirmed" : i < 7 ? "completed" : pick(bookingStatuses);
                const starts = i < 3 ? hoursFromNow(ri(6, 120)) : daysAgo(ri(1, 25));
                db.bookings.push({
                        id: nextId("bkg"),
                        event_type_id: et.id,
                        starts_at: starts,
                        duration_minutes: et.duration_minutes,
                        timezone: pick(["Europe/Paris", "Europe/Berlin", "America/New_York", "UTC"]),
                        status: status as MockBooking["status"],
                        contact_id: person.id,
                        created_at: daysAgo(ri(1, 30)),
                        updated_at: daysAgo(ri(0, 5)),
                        version: ri(1, 4),
                });
        });
}

// ---------------------------------------------------------------------------
// SOND
// ---------------------------------------------------------------------------

function seedSond() {
        const forms: Array<[string, string, MockForm["mode"], MockForm["status"], MockFormQuestion[]]> = [
                ["Pilot readiness survey", "Gauge operational readiness before deploying AMRs", "standard", "published", [
                        { id: "fq-101", label: "Company name", type: "text", required: true },
                        { id: "fq-102", label: "Work email", type: "email", required: true },
                        { id: "fq-103", label: "Facility size (m²)", type: "number", required: true, min: 100 },
                        { id: "fq-104", label: "Current WMS", type: "choice", required: true, options: ["SAP EWM", "Manhattan", "NetSuite WMS", "Spreadsheets", "Other"] },
                        { id: "fq-105", label: "Primary goals", type: "multiple_choice", required: false, options: ["Throughput", "Accuracy", "Labor cost", "Safety"] },
                        { id: "fq-106", label: "Go-live window", type: "date", required: false },
                ]],
                ["NPS — support experience", "How are we doing?", "conversational", "published", [
                        { id: "fq-201", label: "How likely are you to recommend our support?", type: "rating", required: true, min: 0, max: 10 },
                        { id: "fq-202", label: "What should we improve?", type: "text", required: false },
                ]],
                ["Field engineer application", "", "standard", "published", [
                        { id: "fq-301", label: "Full name", type: "text", required: true },
                        { id: "fq-302", label: "Email", type: "email", required: true },
                        { id: "fq-303", label: "Phone", type: "phone", required: true },
                        { id: "fq-304", label: "Years of field experience", type: "number", required: true, min: 0, max: 40 },
                        { id: "fq-305", label: "Regions", type: "multiple_choice", required: true, options: ["EMEA", "NA", "APAC"] },
                        { id: "fq-306", label: "Earliest start date", type: "date", required: false },
                ]],
                ["QBR feedback", "Post-QBR quick pulse", "standard", "closed", [
                        { id: "fq-401", label: "Account name", type: "text", required: true },
                        { id: "fq-402", label: "Session rating", type: "rating", required: true, min: 1, max: 5 },
                ]],
                ["Warehouse safety check", "Weekly operator safety attestation", "conversational", "published", [
                        { id: "fq-501", label: "Site", type: "choice", required: true, options: ["Paris — Dock 3", "Hamburg — Hafen Nord", "Birmingham — Unit 4"] },
                        { id: "fq-502", label: "Aisles clear of obstructions?", type: "choice", required: true, options: ["Yes", "No"] },
                        { id: "fq-503", label: "Incidents this week", type: "number", required: false, min: 0 },
                        { id: "fq-504", label: "Details (if incidents)", type: "text", required: false,
                                conditions: [{ question_id: "fq-503", operator: "greater_than", value: 0 }] },
                ]],
                ["Website contact (draft)", "", "standard", "draft", [
                        { id: "fq-601", label: "Name", type: "text", required: true },
                        { id: "fq-602", label: "Work email", type: "email", required: true },
                        { id: "fq-603", label: "Message", type: "text", required: false },
                ]],
        ];
        for (const [title, description, mode, status, questions] of forms) {
                db.forms.push({
                        id: nextId("frm"),
                        title,
                        description: description || undefined,
                        questions,
                        branding: { accent: "#F59E0B", logo: null },
                        mode,
                        status,
                        routing_rules: status === "published" && title.includes("Pilot")
                                ? [{ conditions: [{ field: "fq-104", operator: "eq", value: "Spreadsheets" }], actions: [{ type: "create_lead", target: "cinq" }] }]
                                : undefined,
                        created_at: daysAgo(ri(20, 120)),
                        updated_at: daysAgo(ri(0, 10)),
                        version: ri(1, 6),
                });
        }

        // Submissions for the three published forms
        const answerValue = (type: string, raw: unknown) => ({ type, value: raw });
        const pilotQs = db.forms[0].questions;
        for (let i = 0; i < 28; i++) {
                db.submissions.push({
                        id: nextId("sub"),
                        form_id: db.forms[0].id,
                        answers: [
                                { question_id: pilotQs[0].id, value: answerValue("text", pick(CONTACT_COMPANIES)) },
                                { question_id: pilotQs[1].id, value: answerValue("email", `ops${i}@${pick(["northwind", "helios", "bluepeak", "ardent"])}.com`) },
                                { question_id: pilotQs[2].id, value: answerValue("number", ri(800, 42000)) },
                                { question_id: pilotQs[3].id, value: answerValue("choice", pick(["SAP EWM", "Manhattan", "NetSuite WMS", "Spreadsheets", "Other"])) },
                                { question_id: pilotQs[4].id, value: answerValue("multiple_choice", ["Throughput", "Accuracy"].slice(0, ri(1, 2))) },
                                ...(ri(0, 1) ? [{ question_id: pilotQs[5].id, value: answerValue("date", dateOnly(ri(10, 90))) }] : []),
                        ],
                        submitted_at: daysAgo(ri(0, 21)),
                });
        }
        const npsQs = db.forms[1].questions;
        for (let i = 0; i < 12; i++) {
                db.submissions.push({
                        id: nextId("sub"),
                        form_id: db.forms[1].id,
                        answers: [
                                { question_id: npsQs[0].id, value: answerValue("rating", ri(6, 10)) },
                                ...(ri(0, 1) ? [{ question_id: npsQs[1].id, value: answerValue("text", pick(["Faster first response", "More proactive comms", "Love the runbooks", "N/A"])) }] : []),
                        ],
                        submitted_at: daysAgo(ri(0, 14)),
                });
        }
        const safetyQs = db.forms[4].questions;
        for (let i = 0; i < 9; i++) {
                const incidents = ri(0, 4) === 0 ? ri(1, 2) : 0;
                db.submissions.push({
                        id: nextId("sub"),
                        form_id: db.forms[4].id,
                        answers: [
                                { question_id: safetyQs[0].id, value: answerValue("choice", pick(["Paris — Dock 3", "Hamburg — Hafen Nord", "Birmingham — Unit 4"])) },
                                { question_id: safetyQs[1].id, value: answerValue("choice", pick(["Yes", "Yes", "No"])) },
                                { question_id: safetyQs[2].id, value: answerValue("number", incidents) },
                                ...(incidents > 0 ? [{ question_id: safetyQs[3].id, value: answerValue("text", "Minor near-miss at dock 2, logged with site lead.") }] : []),
                        ],
                        submitted_at: daysAgo(ri(0, 7)),
                });
        }
}

// ---------------------------------------------------------------------------
// VAULT
// ---------------------------------------------------------------------------

function seedVault() {
        const products: Array<[string, string, string, Array<[string, number, number]>]> = [
                ["Scout AMR", "Autonomous mobile robot for warehouse transport", "AMR-SCOUT", [
                        ["SCOUT-STD", 2_190_000, 14], ["SCOUT-HD", 2_640_000, 6], ["SCOUT-COLD", 2_890_000, 2],
                ]],
                ["Lidar pod", "360° lidar sensor module (field replaceable)", "LID", [
                        ["LID-42", 41_9900 / 100, 21], ["LID-42X", 519_900 / 100, 4],
                ]],
                ["Drive module", "Wheel drive unit with encoder", "DRV", [
                        ["DRV-07", 128_500, 18], ["DRV-07-B", 134_000, 3],
                ]],
                ["Battery pack 48V", "48V 40Ah lithium pack", "BAT", [
                        ["BAT-48V", 89_900, 30], ["BAT-48V-HC", 104_900, 5],
                ]],
                ["Compute cartridge", "Edge compute unit, 32 TOPS", "CMP", [
                        ["CMP-3A", 210_000, 9], ["CMP-5X", 289_000, 2],
                ]],
                ["Charging dock", "Automated charging station", "DCK", [
                        ["DCK-01", 64_500, 11], ["DCK-02-FAST", 92_000, 7],
                ]],
                ["Sensor mast", "Camera + depth module mast", "MST", [
                        ["MST-12", 47_500, 1], ["MST-12P", 61_000, 8],
                ]],
                ["Fleet gateway", "On-prem edge gateway for telemetry", "GTW", [
                        ["GTW-1U", 156_000, 12], ["GTW-RED", 189_000, 3],
                ]],
                ["Pick arm", "Collaborative pick arm attachment", "ARM", [
                        ["ARM-P1", 320_000, 5], ["ARM-P2", 374_000, 2],
                ]],
                ["Conveyor adapter", "AMR-to-conveyor handoff kit", "CNV", [
                        ["CNV-A", 45_000, 16], ["CNV-B", 52_500, 0],
                ]],
                ["Safety bumper set", "Replaceable bumper + skirt kit", "SAF", [
                        ["SAF-K1", 18_900, 24], ["SAF-K2", 22_400, 15],
                ]],
                ["Operator tablet", "Rugged fleet control tablet", "TAB", [
                        ["TAB-R8", 74_900, 10], ["TAB-R8-CASE", 12_900, 27],
                ]],
        ];
        for (const [name, description, skuRoot, variants] of products) {
                const pid = nextId("prd");
                db.products.push({
                        id: pid, name, description, sku: skuRoot,
                        created_at: daysAgo(ri(60, 300)), updated_at: daysAgo(ri(0, 20)), version: ri(1, 5),
                });
                for (const [sku, price, stock] of variants) {
                        const vid = nextId("var");
                        const reserved = stock > 3 ? ri(0, 4) : 0;
                        db.variants.push({
                                id: vid, product_id: pid, sku, price: Math.round(price),
                                stock_quantity: stock, reserved_quantity: reserved,
                                created_at: daysAgo(ri(40, 280)), updated_at: daysAgo(ri(0, 8)), version: ri(1, 9),
                        });
                        const reasons = ["Purchase order received", "Cycle count adjustment", "Customer shipment", "Reserved for pilot", "Return to stock", "Damage write-off", "Sync from Shopify"];
                        for (let m = 0; m < ri(2, 6); m++) {
                                const qty = ri(1, 10);
                                db.movements.push({
                                        id: nextId("mov"),
                                        variant_id: vid,
                                        quantity: ri(0, 1) ? qty : -qty,
                                        reason: pick(reasons),
                                        reference: ri(0, 1) ? `PO-${ri(1000, 9999)}` : undefined,
                                        timestamp: daysAgo(ri(0, 30)),
                                });
                        }
                }
        }

        for (const [name, location] of [
                ["Paris — Dock 3", "12 Quai de la Rapée, Paris"],
                ["Hamburg — Hafen Nord", "Kaistraße 7, Hamburg"],
                ["Birmingham — Unit 4", "4 Foundry Rd, Birmingham"],
                ["Rotterdam — Medisch", "Medisch Centrum 8, Rotterdam"],
        ]) {
                db.warehouses.push({
                        id: nextId("whs"), name, location,
                        created_at: daysAgo(ri(60, 240)), version: ri(1, 3),
                });
        }

        db.shopify.push({
                id: nextId("shp"),
                shop_domain: "lumen-robotics.myshopify.com",
                status: "active",
                last_synced_at: hoursAgo(2),
                product_count: db.products.length,
                created_at: daysAgo(120),
        });
        const logTypes = ["product_push", "stock_sync", "order_pull", "webhook"];
        for (let i = 0; i < 18; i++) {
                const failed = i === 4 || i === 11;
                db.shopifyLogs.push({
                        id: nextId("slog"),
                        sync_type: pick(logTypes),
                        status: failed ? "error" : "success",
                        product_id: pick(db.products).id,
                        shopify_id: ri(7_000_000_000, 7_999_999_999),
                        error_message: failed ? "Shopify API 429 — retried successfully on attempt 2" : undefined,
                        created_at: hoursAgo(i * 3 + 1),
                });
        }
}

// ---------------------------------------------------------------------------
// PAUSE
// ---------------------------------------------------------------------------

function seedPause() {
        const employees: Array<[string, string, string, string, number]> = [
                ["Dana Whitfield", ADMIN_ID, "CEO", "Executive", 900],
                ["Marcus Chen", "usr-002", "CTO", "Engineering", 850],
                ["Priya Natarajan", "usr-003", "Staff Engineer", "Engineering", 640],
                ["Tomás Ferreira", "usr-004", "Sales Lead", "Revenue", 560],
                ["Ingrid Solberg", "usr-005", "Warehouse Ops Manager", "Operations", 720],
                ["Jamal Carter", "usr-006", "Support Specialist", "Support", 380],
                ["Sofia Marchetti", "usr-007", "Field Engineer", "Operations", 290],
                ["Kenji Nakamura", "usr-008", "Data Analyst", "Data", 410],
                ["Amélie Laurent", "emp-009", "People Ops Lead", "People", 520],
                ["Bruno Costa", "emp-010", "Warehouse Technician", "Operations", 180],
                ["Nadia Haddad", "emp-011", "QA Engineer", "Engineering", 240],
                ["Owen Murphy", "emp-012", "Field Technician", "Operations", 95],
                ["Yara Aziz", "emp-013", "Recruiter", "People", 130],
                ["Leo Fontaine", "emp-014", "Warehouse Technician", "Operations", 45],
        ];
        for (const [full_name, id, job_title, department, hireDaysAgo] of employees) {
                const onboardDone = hireDaysAgo > 120;
                db.employees.push({
                        id,
                        full_name,
                        email: `${full_name.toLowerCase().replace(/[^a-z]+/g, ".")}@lumenrobotics.io`,
                        phone: `+33 7 ${ri(10, 99)} ${ri(10, 99)} ${ri(10, 99)} ${ri(10, 99)}`,
                        job_title,
                        department,
                        hire_date: dateOnly(-hireDaysAgo),
                        is_active: full_name !== "Kenji Nakamura",
                        onboarding_tasks: onboardDone ? ["paperwork", "equipment", "training"] : hireDaysAgo > 30 ? ["paperwork", "equipment"] : ["paperwork"],
                        onboarding_completed_at: onboardDone ? daysAgo(hireDaysAgo - 20) : null,
                        created_at: daysAgo(hireDaysAgo),
                        updated_at: daysAgo(ri(0, 20)),
                        version: ri(1, 5),
                });
        }

        const leaves: Array<[string, MockLeave["leave_type"], number, number, MockLeave["status"], string]> = [
                ["usr-003", "annual", 5, 12, "approved", "Family holiday"],
                ["usr-004", "annual", 2, 20, "pending", "Trip to Lisbon"],
                ["usr-006", "sick", -3, -1, "approved", "Flu"],
                ["usr-005", "personal", 1, 7, "pending", "Moving apartments"],
                ["emp-010", "annual", 8, 30, "approved", "Summer break"],
                ["usr-007", "annual", 4, 16, "pending", "Wedding"],
                ["emp-012", "unpaid", 10, 40, "rejected", "Sabbatical request"],
                ["emp-011", "sick", -7, -6, "approved", "Medical appointment"],
                ["usr-008", "annual", 6, 25, "cancelled", "Plans changed"],
                ["emp-014", "personal", 0, 3, "pending", "Administrative errands"],
                ["emp-009", "annual", 12, 45, "approved", "Winter holiday"],
                ["usr-005", "annual", 3, 27, "pending", "Cabin trip"],
        ];
        for (const [employee_id, leave_type, startOffset, createdOffset, status, reason] of leaves) {
                const emp = db.employees.find((e) => e.id === employee_id)!;
                const start = ri(0, 1) ? dateOnly(startOffset) : dateOnly(-ri(1, 20));
                const startDate = new Date(start);
                const end = new Date(startDate.getTime() + ri(2, 10) * 86_400_000).toISOString().slice(0, 10);
                db.leaves.push({
                        id: nextId("lve"),
                        employee_id,
                        employee_name: emp.full_name,
                        leave_type,
                        start_date: start,
                        end_date: end,
                        reason,
                        status,
                        reviewer_id: status === "pending" ? undefined : ADMIN_ID,
                        reviewed_at: status === "pending" ? undefined : daysAgo(ri(0, 6)),
                        created_at: daysAgo(createdOffset < 0 ? 0 : ri(1, 15)),
                        updated_at: daysAgo(ri(0, 4)),
                        version: ri(1, 3),
                });
        }

        for (const [empId, fileName, docType] of [
                ["usr-003", "contract-priya-2024.pdf", "contract"],
                ["usr-003", "certification-lidar.pdf", "certification"],
                ["emp-010", "contract-bruno.pdf", "contract"],
                ["emp-010", "safety-training-2026.pdf", "training"],
                ["emp-011", "nda-nadia.pdf", "nda"],
                ["usr-005", "management-training.pdf", "training"],
                ["emp-012", "contract-owen.pdf", "contract"],
                ["emp-013", "recruiting-playbook-access.pdf", "policy"],
        ]) {
                db.hrDocuments.push({
                        id: nextId("hdoc"),
                        employee_id: empId,
                        file_name: fileName,
                        file_url: `/mock-files/${fileName}`,
                        doc_type: docType,
                        created_at: daysAgo(ri(10, 200)),
                });
        }
}

// ---------------------------------------------------------------------------
// VISTA
// ---------------------------------------------------------------------------

function seedVista() {
        db.dashboards.push(
                {
                        id: "dsh-001",
                        name: "Revenue & pipeline",
                        config: {
                                widgets: [
                                        { i: "w1", type: "kpi", dataSource: "revenue", layout: { x: 0, y: 0, w: 3, h: 2 } },
                                        { i: "w2", type: "kpi", dataSource: "pipeline_value", layout: { x: 3, y: 0, w: 3, h: 2 } },
                                        { i: "w3", type: "line", dataSource: "revenue", layout: { x: 0, y: 2, w: 6, h: 4 } },
                                        { i: "w4", type: "bar", dataSource: "deals_won", layout: { x: 6, y: 0, w: 6, h: 6 } },
                                        { i: "w5", type: "pie", dataSource: "stock_level", layout: { x: 0, y: 6, w: 4, h: 4 } },
                                        { i: "w6", type: "line", dataSource: "contacts", layout: { x: 4, y: 6, w: 8, h: 4 } },
                                ],
                        },
                        created_at: daysAgo(90), updated_at: daysAgo(3), version: 7,
                },
                {
                        id: "dsh-002",
                        name: "Support & fulfillment",
                        config: {
                                widgets: [
                                        { i: "w1", type: "kpi", dataSource: "bookings", layout: { x: 0, y: 0, w: 3, h: 2 } },
                                        { i: "w2", type: "kpi", dataSource: "support_tickets", layout: { x: 3, y: 0, w: 3, h: 2 } },
                                        { i: "w3", type: "bar", dataSource: "leave_requests", layout: { x: 0, y: 2, w: 6, h: 4 } },
                                        { i: "w4", type: "line", dataSource: "stock_level", layout: { x: 6, y: 2, w: 6, h: 4 } },
                                ],
                        },
                        created_at: daysAgo(60), updated_at: daysAgo(8), version: 4,
                },
                {
                        id: "dsh-003",
                        name: "Exec overview",
                        config: {
                                widgets: [
                                        { i: "w1", type: "kpi", dataSource: "revenue", layout: { x: 0, y: 0, w: 4, h: 2 } },
                                        { i: "w2", type: "line", dataSource: "pipeline_value", layout: { x: 0, y: 2, w: 12, h: 5 } },
                                ],
                        },
                        created_at: daysAgo(20), updated_at: daysAgo(1), version: 2,
                },
        );

        // 45 days of data points for every metric the widgets + KPI panel reference.
        const metrics: Array<[string, number, number, "up" | "flat" | "wave"]> = [
                ["revenue", 120_000, 18_000, "up"],
                ["pipeline_value", 1_400_000, 90_000, "wave"],
                ["stock_level", 240, 30, "wave"],
                ["contacts", 22, 2, "up"],
                ["deals_won", 3, 1.4, "wave"],
                ["bookings", 5, 2.2, "wave"],
                ["support_tickets", 12, 4, "wave"],
                ["leave_requests", 3, 1.6, "wave"],
        ];
        const days = 45;
        for (const [metric, base, noise, trend] of metrics) {
                for (let d = days; d >= 0; d--) {
                        const progress = (days - d) / days;
                        const drift =
                                trend === "up" ? progress * base * 0.35 : trend === "wave" ? Math.sin(d / 4) * base * 0.08 : 0;
                        db.dataPoints.push({
                                timestamp: daysAgo(d, false).slice(0, 10),
                                metric_name: metric,
                                value: Math.max(0, Math.round(base * 0.75 + drift + (rnd() - 0.5) * noise)),
                        });
                }
        }
}

// ---------------------------------------------------------------------------
// Cross-app platform
// ---------------------------------------------------------------------------

function seedPlatform() {
        db.inbox.push(
                { id: nextId("inb"), kind: "low_stock", app: "vault", title: "CNV-B is out of stock", subtitle: "Conveyor adapter — Hamburg", severity: "critical", created_at: hoursAgo(2), deep_link: "/vault/products" },
                { id: nextId("inb"), kind: "approval", app: "spark", title: "Workflow run awaits your approval", subtitle: "Pilot kickoff approval", severity: "warning", created_at: hoursAgo(9), deep_link: "/admin/approvals" },
                { id: nextId("inb"), kind: "leave_request", app: "pause", title: "4 leave requests need review", subtitle: "Next: Tomás Ferreira, in 20 days", severity: "info", created_at: hoursAgo(11), deep_link: "/pause/leave" },
                { id: nextId("inb"), kind: "ticket", app: "dial", title: "Urgent ticket unassigned for 1h", subtitle: "Dock AMR throws E-217 on boot", severity: "critical", created_at: hoursAgo(3), deep_link: "/dial/tickets" },
                { id: nextId("inb"), kind: "deal_won", app: "cinq", title: "Atlas Fleet rollout marked won", subtitle: "$240,000 — contract to follow", severity: "info", created_at: hoursAgo(26), deep_link: "/cinq/deals" },
                { id: nextId("inb"), kind: "form_response", app: "sond", title: "12 new NPS responses", subtitle: "Average score 8.6", severity: "info", created_at: hoursAgo(30), deep_link: "/sond" },
                { id: nextId("inb"), kind: "sync_error", app: "vault", title: "Shopify sync retried twice", subtitle: "429 rate limit — recovered", severity: "warning", created_at: hoursAgo(44), deep_link: "/vault/dashboard" },
                { id: nextId("inb"), kind: "booking", app: "tempo", title: "Meridian Health QBR booked", subtitle: "Thursday 14:00 CET", severity: "info", created_at: hoursAgo(50), deep_link: "/tempo/dashboard" },
                { id: nextId("inb"), kind: "dlq", app: "spark", title: "5 events in the dead-letter queue", subtitle: "Oldest: 10 days", severity: "warning", created_at: hoursAgo(60), deep_link: "/spark/dlq" },
                { id: nextId("inb"), kind: "mention", app: "dial", title: "Marcus mentioned you", subtitle: "SSO rollout plan — review before Thursday", severity: "info", created_at: hoursAgo(5), deep_link: "/dial" },
        );

        db.changelog.push(
                { id: 6, version: "2026.10", date: dateOnly(-2), title: "VISTA drill-down goes cross-app", description: "Click any chart point to jump to the underlying records in CINQ, VAULT or DIAL.", category: "New", breaking_change: false },
                { id: 5, version: "2026.9.2", date: dateOnly(-9), title: "Faster command palette", description: "Palette search now debounces at 300ms and shows cross-app results inline.", category: "Improved", breaking_change: false },
                { id: 4, version: "2026.9.1", date: dateOnly(-14), title: "Fixed outbox lag after migrations", description: "The dispatcher watchdog restarts the outbox worker if lag exceeds 60s.", category: "Fixed", breaking_change: false },
                { id: 3, version: "2026.9", date: dateOnly(-25), title: "PAUSE onboarding tasks", description: "Track paperwork, equipment and training per employee with completion receipts.", category: "New", breaking_change: false },
                { id: 2, version: "2026.8.4", date: dateOnly(-38), title: "SOND conversational mode", description: "Forms can switch to a one-question-at-a-time flow with conditional visibility.", category: "New", breaking_change: false },
                { id: 1, version: "2026.8", date: dateOnly(-52), title: "Suite GA", description: "All ten apps available on one database. API keys, SSO and audit log included.", category: "New", breaking_change: true },
        );
}
