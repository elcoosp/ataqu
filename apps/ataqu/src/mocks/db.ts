/**
 * In-memory demo database backing the MSW mock layer.
 *
 * One deterministic seed (mulberry32 PRNG, fixed constants) produces a rich,
 * internally-consistent "demo company" — Lumen Robotics, a fictional robotics
 * hardware scale-up — whose data spans every app:
 *
 *   AEGIS auth/users/keys   CINQ CRM          DIAL chat + tickets
 *   PIVOT docs/databases    SPARK automations TEMPO scheduling
 *   SOND forms              VAULT inventory   PAUSE HR
 *   VISTA analytics         cross-app inbox/search/health/changelog
 *
 * All ids are stable short strings (`cnt-007`) so logs, screenshots and
 * debugging stay readable. Dates are generated relative to `Date.now()` so
 * dashboards always look fresh.
 *
 * Mutations from the UI mutate this object directly (version++, audit trail),
 * which is what makes the demo feel like a real end-to-end system.
 */

// ---------------------------------------------------------------------------
// Deterministic PRNG + id/date helpers
// ---------------------------------------------------------------------------

const PRNG_SEED = 0x41544151; // "ATAQ"
let prngState = PRNG_SEED;

/** mulberry32 — tiny, fast, deterministic. Exported for seed-level noise. */
export const rnd = () => {
        prngState |= 0;
        prngState = (prngState + 0x6d2b79f5) | 0;
        let t = Math.imul(prngState ^ (prngState >>> 15), 1 | prngState);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** Deterministic integer in [min, max]. */
export const ri = (min: number, max: number) =>
        Math.floor(rnd() * (max - min + 1)) + min;

/** Pick a deterministic element from a list. */
export const pick = <T>(list: readonly T[]): T =>
        list[Math.floor(rnd() * list.length)];

const counters = new Map<string, number>();

/** `nextId("cnt")` → `cnt-007`. */
export const nextId = (prefix: string): string => {
        const n = (counters.get(prefix) ?? 0) + 1;
        counters.set(prefix, n);
        return `${prefix}-${String(n).padStart(3, "0")}`;
};

const DAY = 86_400_000;
export const now = () => Date.now();
export const daysAgo = (d: number, hourJitter = true) =>
        new Date(now() - d * DAY - (hourJitter ? ri(0, 20) * 3_600_000 : 0)).toISOString();
export const daysFromNow = (d: number) => new Date(now() + d * DAY).toISOString();
export const hoursAgo = (h: number) => new Date(now() - h * 3_600_000).toISOString();
export const hoursFromNow = (h: number) => new Date(now() + h * 3_600_000).toISOString();

/** ISO date (YYYY-MM-DD) relative to today. */
export const dateOnly = (offsetDays: number) =>
        new Date(now() + offsetDays * DAY).toISOString().slice(0, 10);

// ---------------------------------------------------------------------------
// Fixed tenancy + identity (the demo login)
// ---------------------------------------------------------------------------

export const TENANT_ID = "ten-000-000";
export const ADMIN_ID = "usr-001"; // demo@ataqu.com — also a PAUSE employee (see employees)
export const DEMO_PASSWORD = "demo1234";

// ---------------------------------------------------------------------------
// Entity types (mirror of packages/api-client/src/types.ts, mock-local)
// ---------------------------------------------------------------------------

export interface MockUser {
        id: string;
        email: string;
        name?: string;
        password: string;
        version: number;
        role: string;
        is_active: boolean;
        mfa_enabled: boolean;
        last_login_at?: string | null;
        created_at?: string;
}

export interface MockApiKey {
        id: string;
        name: string;
        prefix: string;
        scopes: string[];
        created_at: string;
        last_used_at?: string | null;
}

export interface MockAuditEntry {
        id: number;
        user_id: string;
        action: string;
        app: string;
        entity_type?: string;
        entity_id?: string;
        old_value?: Record<string, unknown>;
        new_value?: Record<string, unknown>;
        ip_address?: string;
        user_agent?: string;
        created_at: string;
}

export interface MockRole {
        id: string;
        name: string;
        permissions: string[];
        created_at: string;
}

export interface MockPermissionRow {
        user_id: string;
        user_name?: string;
        user_email: string;
        roles: Record<string, "admin" | "editor" | "viewer" | "none">;
}

export interface MockPendingApproval {
        id: string;
        tenant_id: string;
        workflow_id: string;
        run_id: string;
        approver_role: string;
        status: string;
        created_at: string;
}

export interface MockTenant {
        id: string;
        name: string;
        plan: string;
        userCount: number;
        apiKeyCount: number;
        settings: Record<string, unknown>;
        version: number;
}

export interface MockContact {
        id: string;
        name: string;
        email: string;
        company?: string;
        phone?: string;
        lead_score?: number;
        custom_fields?: Record<string, unknown>;
        created_at: string;
        updated_at: string;
        version: number;
}

export interface MockDeal {
        id: string;
        title: string;
        amount: number;
        status: "open" | "won" | "lost";
        contact_id: string;
        pipeline_stage_id: string;
        owner_id?: string;
        probability?: number;
        quantity?: number;
        created_at: string;
        updated_at: string;
        version: number;
}

export interface MockStage {
        id: string;
        name: string;
        order: number;
        version: number;
}

export interface MockActivity {
        id: string;
        activity_type: "call" | "email" | "meeting" | "task" | "note";
        description: string;
        scheduled_at?: string;
        contact_id: string;
        deal_id?: string;
        created_at: string;
}

export interface MockTask {
        id: string;
        title: string;
        description?: string;
        due_date?: string;
        status: "pending" | "completed" | "cancelled";
        contact_id?: string;
        deal_id?: string;
        assigned_to?: string;
        created_at: string;
        updated_at: string;
        version: number;
}

export interface MockEstablishment {
        id: string;
        company_name: string;
        siret?: string | null;
        address?: string | null;
        created_at: string;
        updated_at: string;
}

export interface MockTrackingEvent {
        id: string;
        contact_id: string;
        event_type: "open" | "click" | "bounce" | "send" | "deliver";
        metadata?: Record<string, unknown>;
        created_at: string;
}

export interface MockIntegrationToggle {
        integration: string;
        enabled: boolean;
}

export interface MockChannel {
        id: string;
        name: string;
        channel_type: "public" | "private" | "direct_message";
        version: number;
        created_by: string;
        participants: string[];
        unread_count: number;
        created_at: string;
        updated_at: string;
        archived_at?: string | null;
}

export interface MockMessage {
        id: string;
        channel_id: string;
        author_id: string;
        version: number;
        content: string;
        sent_at: string;
        thread_id?: string | null;
        edited_at?: string | null;
        deleted_at?: string | null;
}

export interface MockThread {
        id: string;
        channel_id: string;
        parent_message_id: string;
        created_at: string;
}

export interface MockMention {
        id: string;
        message_id: string;
        user_id: string;
        read_at?: string | null;
}

export interface MockReaction {
        id: string;
        message_id: string;
        user_id: string;
        emoji: string;
        created_at: string;
}

export interface MockTicket {
        id: string;
        subject: string;
        status: "open" | "pending" | "resolved" | "closed";
        priority: "low" | "medium" | "high" | "urgent";
        requester_name: string;
        requester_email: string;
        assignee_id: string | null;
        last_message: string | null;
        last_message_at: string | null;
        created_at: string;
        updated_at: string;
}

export interface MockTicketMessage {
        id: string;
        ticket_id: string;
        from_customer: boolean;
        content: string;
        created_at: string;
}

export interface MockDocument {
        id: string;
        title: string;
        content: string;
        created_at: string;
        updated_at: string;
        version: number;
}

export interface MockDocVersion {
        id: string;
        document_id: string;
        title: string;
        content: string;
        version: number;
        created_at: string;
}

export interface MockDatabase {
        id: string;
        name: string;
        created_at: string;
}

export interface MockDatabaseRow {
        id: string;
        database_id: string;
        data: Record<string, unknown>;
        created_at: string;
}

export interface MockBlock {
        id: string;
        document_id: string;
        block_type: "markdown" | "table" | "view" | "checklist";
        content: Record<string, unknown>;
        created_at: string;
        updated_at: string;
        version: number;
}

export interface MockRelation {
        id: string;
        from_block_id: string;
        to_block_id: string;
        relation_type: string;
}

export interface MockTemplate {
        id: string;
        name: string;
        content: string;
        created_at: string;
}

export type MockTrigger =
        | { type: "webhook"; path: string }
        | { type: "schedule"; cron: string }
        | { type: "event"; event_type: string };

export type MockCondition =
	| { type: "field_equals"; field: string; value: unknown }
	| { type: "field_not_equals"; field: string; value: unknown }
	| { type: "field_greater_than"; field: string; value: number }
	| { type: "field_less_than"; field: string; value: number }
	| { type: "field_contains"; field: string; value: string }
	| { type: "field_exists"; field: string }
	| { type: "field_not_exists"; field: string }
	| { type: "and"; conditions: MockCondition[] }
	| { type: "or"; conditions: MockCondition[] }
	| { type: "not"; condition: MockCondition };

export type MockAction =
        | { type: "request_approval"; approver_role: string }
        | { type: "send_email"; to: string; subject: string; body: string }
        | { type: "create_dial_channel"; name: string; channel_type: string; participants: string[] }
        | { type: "send_dial_message"; channel_id: string; content: string }
        | { type: "create_cinq_contact"; name: string; email: string; phone?: string }
        | { type: "create_cinq_activity"; contact_id: string; activity_type: string; description: string }
        | { type: "reserve_vault_stock"; variant_id: string; quantity: number }
        | { type: "adjust_vault_stock"; variant_id: string; delta: number; reason: string }
        | { type: "create_cinq_lead"; name: string; email: string; source: string }
        | { type: "webhook"; url: string; method: string; body: unknown; headers: Record<string, string> }
        | { type: "update_record"; table: string; record_id: string; fields: string };

export interface MockWorkflow {
        id: string;
        name: string;
        trigger: MockTrigger;
        conditions: MockCondition[];
        actions: MockAction[];
        is_active: boolean;
        webhook_secret?: string;
        created_at: string;
        updated_at: string;
        version: number;
}

export interface MockRun {
        id: string;
        workflow_id: string;
        status: "running" | "pending_approval" | "approved" | "rejected" | "completed" | "failed";
        payload: Record<string, unknown>;
        created_at: string;
        updated_at: string;
}

export interface MockDlqEntry {
        id: string;
        event_type: string;
        payload: Record<string, unknown>;
        error: string;
        attempts: number;
        created_at: string;
}

export interface MockEventType {
        id: string;
        tenant_id: string;
        name: string;
        slug: string;
        description?: string;
        duration_minutes: number;
        is_active: boolean;
        created_at: string;
        updated_at: string;
        version: number;
}

export interface MockSlot {
        id: string;
        event_type_id: string;
        start_time: string;
        end_time: string;
        is_booked: boolean;
}

export interface MockBooking {
        id: string;
        event_type_id: string;
        starts_at: string;
        duration_minutes: number;
        timezone: string;
        status: "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
        contact_id?: string;
        created_at: string;
        updated_at: string;
        version: number;
}

export interface MockFormQuestion {
        id: string;
        label: string;
        type:
                | "text"
                | "number"
                | "date"
                | "choice"
                | "multiple_choice"
                | "rating"
                | "email"
                | "phone";
        required: boolean;
        options?: string[];
        min?: number;
        max?: number;
        conditions?: Array<{
                question_id: string;
                operator:
                        | "equals"
                        | "not_equals"
                        | "greater_than"
                        | "less_than"
                        | "contains"
                        | "not_contains"
                        | "is_empty"
                        | "is_not_empty";
                value: unknown;
        }>;
}

export interface MockForm {
        id: string;
        title: string;
        description?: string;
        questions: MockFormQuestion[];
        branding?: Record<string, unknown>;
        mode: "standard" | "conversational";
        status: "draft" | "published" | "closed";
        routing_rules?: Array<{
                conditions: Array<{ field: string; operator: "eq" | "neq" | "contains" | "not_contains"; value: string }>;
                actions: Array<{ type: "notify" | "create_lead" | "webhook"; target?: string; url?: string }>;
        }>;
        created_at: string;
        updated_at: string;
        version: number;
}

export interface MockSubmission {
        id: string;
        form_id: string;
        answers: Array<{ question_id: string; value: { type: string; value: unknown } }>;
        respondent_id?: string;
        submitted_at: string;
}

export interface MockProduct {
        id: string;
        name: string;
        description: string;
        sku: string;
        created_at: string;
        updated_at: string;
        version: number;
}

export interface MockVariant {
        id: string;
        product_id: string;
        sku: string;
        price: number; // cents
        stock_quantity: number;
        reserved_quantity: number;
        created_at: string;
        updated_at: string;
        version: number;
}

export interface MockMovement {
        id: string;
        variant_id: string;
        quantity: number;
        reason: string;
        reference?: string;
        timestamp: string;
}

export interface MockWarehouse {
        id: string;
        name: string;
        location?: string;
        created_at: string;
        version: number;
}

export interface MockShopifyIntegration {
        id: string;
        shop_domain: string;
        status: "active" | "error" | "disconnected";
        last_synced_at?: string;
        product_count?: number;
        created_at: string;
}

export interface MockShopifySyncLog {
        id: string;
        sync_type: string;
        status: string;
        product_id?: string;
        shopify_id?: number;
        error_message?: string;
        created_at: string;
}

export interface MockEmployee {
        id: string;
        full_name: string;
        email: string;
        phone?: string;
        job_title: string;
        department?: string;
        hire_date: string;
        is_active: boolean;
        onboarding_tasks: string[];
        onboarding_completed_at: string | null;
        created_at: string;
        updated_at: string;
        version: number;
}

export interface MockLeave {
        id: string;
        employee_id: string;
        employee_name?: string;
        leave_type: "annual" | "sick" | "personal" | "unpaid";
        start_date: string;
        end_date: string;
        reason?: string;
        status: "pending" | "approved" | "rejected" | "cancelled";
        reviewer_id?: string;
        reviewed_at?: string;
        created_at: string;
        updated_at: string;
        version: number;
}

export interface MockHrDocument {
        id: string;
        employee_id: string;
        file_name: string;
        file_url: string;
        doc_type: string;
        created_at: string;
}

export interface MockDashboard {
        id: string;
        name: string;
        config: {
                widgets?: Array<{
                        i: string;
                        type: "kpi" | "bar" | "line" | "pie";
                        dataSource: string;
                        data?: unknown;
                        layout?: Record<string, unknown>;
                }>;
        };
        created_at: string;
        updated_at: string;
        version: number;
}

export interface MockDataPoint {
        timestamp: string;
        metric_name: string;
        value: number;
}

export interface MockInboxItem {
        id: string;
        kind: string;
        app: string;
        title: string;
        subtitle?: string | null;
        severity: "info" | "warning" | "critical";
        created_at: string;
        deep_link: string;
}

export interface MockChangelogEntry {
        id: number;
        version: string;
        date: string;
        title: string;
        description: string;
        category: "New" | "Improved" | "Fixed";
        breaking_change: boolean;
}

// ---------------------------------------------------------------------------
// The database
// ---------------------------------------------------------------------------

export const db = {
        users: [] as MockUser[],
        apiKeys: [] as MockApiKey[],
        audit: [] as MockAuditEntry[],
        roles: [] as MockRole[],
        permissions: [] as MockPermissionRow[],
        pendingApprovals: [] as MockPendingApproval[],
        tenant: {
                id: TENANT_ID,
                name: "Lumen Robotics",
                plan: "scale",
                userCount: 0,
                apiKeyCount: 0,
                settings: {
                        timezone: "Europe/Paris",
                        week_start: "monday",
                        date_format: "YYYY-MM-DD",
                        currency: "USD",
                        fiscal_year_start: "01",
                },
                version: 4,
        } as MockTenant,

        stages: [] as MockStage[],
        contacts: [] as MockContact[],
        deals: [] as MockDeal[],
        activities: [] as MockActivity[],
        tasks: [] as MockTask[],
        establishments: [] as MockEstablishment[],
        tracking: [] as MockTrackingEvent[],
        integrationToggles: [
                { integration: "dial", enabled: true },
                { integration: "spark", enabled: true },
        ] as MockIntegrationToggle[],

        channels: [] as MockChannel[],
        messages: [] as MockMessage[],
        threads: [] as MockThread[],
        mentions: [] as MockMention[],
        reactions: [] as MockReaction[],
        tickets: [] as MockTicket[],
        ticketMessages: [] as MockTicketMessage[],

        documents: [] as MockDocument[],
        docVersions: [] as MockDocVersion[],
        databases: [] as MockDatabase[],
        databaseRows: [] as MockDatabaseRow[],
        blocks: [] as MockBlock[],
        relations: [] as MockRelation[],
        templates: [] as MockTemplate[],

        workflows: [] as MockWorkflow[],
        runs: [] as MockRun[],
        dlq: [] as MockDlqEntry[],

        eventTypes: [] as MockEventType[],
        slots: [] as MockSlot[],
        bookings: [] as MockBooking[],

        forms: [] as MockForm[],
        submissions: [] as MockSubmission[],

        products: [] as MockProduct[],
        variants: [] as MockVariant[],
        movements: [] as MockMovement[],
        warehouses: [] as MockWarehouse[],
        shopify: [] as MockShopifyIntegration[],
        shopifyLogs: [] as MockShopifySyncLog[],
        amazon: {
		connected: true,
		marketplace_id: "A13V1IA3ZH6PLE",
		seller_id: "A2K7X4P9Q",
		last_synced_at: hoursAgo(5),
	} as { connected: boolean; marketplace_id?: string; seller_id?: string; last_synced_at?: string },

        employees: [] as MockEmployee[],
        leaves: [] as MockLeave[],
        hrDocuments: [] as MockHrDocument[],

        dashboards: [] as MockDashboard[],
        dataPoints: [] as MockDataPoint[],

        inbox: [] as MockInboxItem[],
        changelog: [] as MockChangelogEntry[],
        inboxDismissed: new Set<string>(),
        changelogReadAt: null as string | null,
        onboardingCompletedTasks: ["import-contacts", "connect-cinq-dial", "invite-team"],
        ipAllowlist: ["203.0.113.0/24", "198.51.100.7"],
};

/** Version bump helper — every mutation bumps and returns the new version. */
export const bump = (entity: { version: number }) => {
        entity.version += 1;
        return entity.version;
};

/** Append an audit entry (mirrors the backend audit middleware). */
export const audit = (
        userId: string,
        action: string,
        app: string,
        entityType?: string,
        entityId?: string,
        newValue?: Record<string, unknown>,
) => {
        db.audit.unshift({
                id: db.audit.length + 1,
                user_id: userId,
                action,
                app,
                entity_type: entityType,
                entity_id: entityId,
                new_value: newValue,
                ip_address: "203.0.113.42",
                user_agent: "ataqu-demo",
                created_at: nowIso2(),
        });
};

const nowIso2 = () => new Date().toISOString();

export const userName = (id: string | null | undefined) =>
        db.users.find((u) => u.id === id)?.name ?? "Unknown";

/**
 * KPI summary computed LIVE from the database — the analytics always agree
 * with the underlying apps, which is what makes the suite feel real.
 */
export const computeKpis = () => {
        const won = db.deals.filter((d) => d.status === "won");
        return {
                total_events: db.activities.length + db.tracking.length,
                total_contacts: db.contacts.length,
                total_deals: db.deals.length,
                total_deals_won: won.length,
                total_pipeline_value: db.deals
                        .filter((d) => d.status === "open")
                        .reduce((s, d) => s + d.amount * (d.quantity ?? 1), 0),
                total_revenue: won.reduce((s, d) => s + d.amount * (d.quantity ?? 1), 0),
                total_products: db.products.length,
                low_stock_variants: db.variants.filter((v) => v.stock_quantity <= 5).length,
                total_bookings: db.bookings.length,
                pending_leave_requests: db.leaves.filter((l) => l.status === "pending").length,
                last_updated: nowIso2(),
        };
};
