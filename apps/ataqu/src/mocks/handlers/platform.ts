/**
 * Cross-app platform handlers — unified search, inbox, health, changelog,
 * onboarding, GDPR, migration tooling, plus the two integration endpoints the
 * SPA's VAULT widgets call (`/api/v1/integrations/*`, `/api/v1/cross-app/*`).
 *
 * Path notes (documented in ATAQU_BLUEPRINT.md → "Contract mismatches"):
 * the SPA calls `/api/v1/inbox` and `/api/migration/parse`, while the Rust
 * router mounts `/api/v1/inbox/inbox` and `/api/migration/migration/parse`;
 * the mocks serve the SPA's paths, and the blueprint includes the two-line
 * Rust patch to align the real router.
 */
import { http, type HttpHandler } from "msw";
import { db } from "../db";
import {
        apiError,
        bare,
        callerId,
        jsonBody,
        noContent,
        ok,
        validationError,
} from "../util";

export const platformHandlers: HttpHandler[] = [
        // -------------------------------------------------------- unified search
        http.get("/api/search", ({ request }) => {
                if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
                const qs = (new URL(request.url).searchParams.get("q") ?? "").toLowerCase();
                if (qs.length < 2) return bare([]);
                const results: Array<{ app: string; entity_type: string; id: string; title: string; subtitle?: string }> = [];
                const push = (app: string, entity_type: string, id: string, title: string, subtitle?: string) => {
                        if (title.toLowerCase().includes(qs) && results.length < 20) {
                                results.push({ app, entity_type, id, title, subtitle });
                        }
                };
                for (const c of db.contacts) push("cinq", "contact", c.id, c.name, c.company);
                for (const d of db.deals) push("cinq", "deal", d.id, d.title, d.status);
                for (const d of db.documents) push("pivot", "document", d.id, d.title);
                for (const dd of db.databases) push("pivot", "database", dd.id, dd.name);
                for (const e of db.employees) push("pause", "employee", e.id, e.full_name, e.job_title);
                for (const u of db.users) push("aegis", "user", u.id, u.name ?? u.email, u.role);
                for (const p of db.products) push("vault", "product", p.id, p.name, p.sku);
                for (const w of db.workflows) push("spark", "workflow", w.id, w.name, w.is_active ? "active" : "paused");
                for (const dash of db.dashboards) push("vista", "dashboard", dash.id, dash.name);
                for (const et of db.eventTypes) push("tempo", "event_type", et.id, et.name);
                for (const f of db.forms) push("sond", "form", f.id, f.title, f.status);
                for (const m of db.messages) {
                        if (m.content.toLowerCase().includes(qs) && results.length < 20) {
                                results.push({ app: "dial", entity_type: "message", id: m.id, title: m.content.slice(0, 60) });
                        }
                }
                return bare(results);
        }),

        // ------------------------------------------------------------------ inbox
        http.get("/api/v1/inbox", ({ request }) => {
                if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
                const limit = Number(new URL(request.url).searchParams.get("limit") ?? 50);
                return bare(
                        db.inbox
                                .filter((i) => !db.inboxDismissed.has(i.id))
                                .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
                                .slice(0, limit),
                );
        }),
        // Also serve the backend's (doubly-nested) path so both contract shapes work.
        http.get("/api/v1/inbox/inbox", ({ request }) => {
                if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
                return bare(db.inbox);
        }),

        // ----------------------------------------------------------------- health
        http.get("/api/v1/health/status", ({ request }) => {
                if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
                return ok({
                        status: "Nominal",
                        timestamp: new Date().toISOString(),
                        components: {
                                outbox: {
                                        status: "Nominal",
                                        lag_seconds: 0.4,
                                        pending_events: 3,
                                        last_dispatched_at: new Date(Date.now() - 2_000).toISOString(),
                                },
                                spark_workflows: {
                                        status: "Nominal",
                                        total: db.workflows.length,
                                        failed_last_hour: 0,
                                        dlq_depth: db.dlq.length,
                                },
                                db_connection_pools: { used: 7, max: 40, waiting: 0 },
                        },
                });
        }),

        // -------------------------------------------------------------- changelog
        http.get("/api/v1/changelog", ({ request }) => {
                if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
                return bare(db.changelog);
        }),
        http.get("/api/v1/changelog/unread", ({ request }) => {
                if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
                const cutoff = db.changelogReadAt;
                return bare(cutoff ? db.changelog.filter((c) => c.date > cutoff) : db.changelog);
        }),
        http.post("/api/v1/changelog/mark-read", ({ request }) => {
                if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
                db.changelogReadAt = new Date().toISOString();
                return noContent();
        }),

        // -------------------------------------------------------------- onboarding
        http.get("/api/v1/onboarding/status", ({ request }) => {
                if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
                return ok({
                        tenant_id: db.tenant.id,
                        tasks_completed: db.onboardingCompletedTasks,
                        last_active_at: new Date().toISOString(),
                        progress_percentage: Math.round(
                                (db.onboardingCompletedTasks.length / 5) * 100,
                        ),
                });
        }),
        http.post("/api/v1/onboarding/task-complete", async ({ request }) => {
                if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
                const { task_id } = await jsonBody<{ task_id: string }>(request);
                if (!task_id) return validationError("task_id is required");
                if (!db.onboardingCompletedTasks.includes(task_id)) db.onboardingCompletedTasks.push(task_id);
                return noContent();
        }),
        http.get("/api/v1/onboarding/team-status", ({ request }) => {
                if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
                return ok({
                        users: db.users.map((u) => ({
                                user_id: u.id,
                                name: u.name ?? null,
                                email: u.email,
                                last_login_at: u.last_login_at ?? null,
                                role: u.role,
                                is_active: u.is_active,
                        })),
                        tenant_progress: Math.round((db.onboardingCompletedTasks.length / 5) * 100),
                });
        }),

        // ---------------------------------------------------- vault integrations
        http.get("/api/v1/integrations/status", ({ request }) => {
                if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
                return ok({
                        integrations: [
                                { key: "shopify", enabled: db.shopify[0]?.status === "active", label: "Shopify" },
                                { key: "amazon", enabled: db.amazon.connected, label: "Amazon Seller" },
                        ],
                });
        }),
        http.post("/api/v1/integrations/toggle", async ({ request }) => {
                if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
                const body = await jsonBody<{ key: string; enabled: boolean }>(request);
                if (body.key === "shopify" && db.shopify[0]) {
                        db.shopify[0].status = body.enabled ? "active" : "disconnected";
                }
                if (body.key === "amazon") db.amazon.connected = body.enabled;
                return ok({ key: body.key, enabled: body.enabled });
        }),

        // ------------------------------------------------------------ cross-app
        http.get("/api/v1/cross-app/relations", ({ request }) => {
                if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
                const url = new URL(request.url);
                const entityType = url.searchParams.get("entity_type");
                const entityId = url.searchParams.get("entity_id");
                // Demo: relate the biggest open deal + its contact + linked channel.
                const deal = db.deals.find((d) => d.id === entityId) ?? db.deals.find((d) => d.status === "open");
                if (!deal) return bare([]);
                const contact = db.contacts.find((c) => c.id === deal.contact_id);
                const channel = db.channels.find((c) => c.name === "sales-war-room");
                return bare([
                        ...(entityType !== "contact" && contact
                                ? [{ app: "cinq", entity_type: "contact", id: contact.id, label: contact.name, url: `/cinq/contacts/${contact.id}` }]
                                : []),
                        ...(channel
                                ? [{ app: "dial", entity_type: "channel", id: channel.id, label: `#${channel.name}`, url: `/dial/channels/${channel.id}` }]
                                : []),
                        {
                                app: "vault",
                                entity_type: "product",
                                id: db.products[0]?.id ?? "",
                                label: db.products[0]?.name ?? "Scout AMR",
                                url: `/vault/products/${db.products[0]?.id ?? ""}`,
                        },
                ]);
        }),

        // -------------------------------------------------------------- migration
        http.post("/api/migration/parse", parseMigrationFile),
        // The real router nests this endpoint one level deeper; serve both shapes.
        http.post("/api/migration/migration/parse", parseMigrationFile),
        http.post("/api/migration/import", async ({ request }) => {
                const actor = callerId(request);
                if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
                const body = await jsonBody<{
                        target_app: "cinq" | "vault" | "pause";
                        mapping: Record<string, string>;
                        data: Array<Record<string, string>>;
                }>(request);
                if (!body.data?.length) return validationError("No rows to import");
                let imported = 0;
                let failed = 0;
                for (const row of body.data) {
                        const mapped = Object.fromEntries(
                                Object.entries(body.mapping ?? {}).map(([src, dst]) => [dst, row[src]]),
                        );
                        if (body.target_app === "cinq" && mapped.name && mapped.email?.includes("@")) {
                                db.contacts.push({
                                        id: `cnt-imp-${imported + 1}-${crypto.randomUUID().slice(0, 4)}`,
                                        name: mapped.name,
                                        email: mapped.email,
                                        company: mapped.company,
                                        lead_score: 50,
                                        created_at: new Date().toISOString(),
                                        updated_at: new Date().toISOString(),
                                        version: 1,
                                });
                                imported += 1;
                        } else {
                                failed += 1;
                        }
                }
                return ok({ imported, failed });
        }),

        // ------------------------------------------------------------------- gdpr
        http.delete("/api/gdpr/tenants/:id", ({ request }) => {
                if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
                // Never actually deletes the demo tenant — reports the saga instead.
                return ok({ saga_id: `saga-${crypto.randomUUID().slice(0, 8)}`, status: "deactivate_users" });
        }),
];

/** Shared CSV/JSON parsing for both migration-parse route shapes. */
async function parseMigrationFile({ request }: { request: Request }) {
        if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
        const body = await jsonBody<{ file: string; format: "csv" | "json" }>(request);
        let text = "";
        try {
                text = atob(body.file ?? "");
        } catch {
                text = body.file ?? "";
        }
        if (!text.trim()) return validationError("Provide a file to parse");
        if (body.format === "json") {
                try {
                        const data = JSON.parse(text) as Array<Record<string, string>>;
                        return ok({ columns: Object.keys(data[0] ?? {}), sample: data.slice(0, 5) });
                } catch {
                        return validationError("Invalid JSON");
                }
        }
        const lines = text.split(/\r?\n/).filter(Boolean);
        const columns = (lines[0] ?? "").split(",").map((c) => c.trim());
        const sample = lines.slice(1, 6).map((line) => {
                const values = line.split(",");
                return Object.fromEntries(columns.map((c, i) => [c, values[i]?.trim() ?? ""]));
        });
        return ok({ columns, sample });
}
