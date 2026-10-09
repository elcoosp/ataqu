/**
 * VISTA (analytics) handlers — dashboards, KPIs (computed live from the mock
 * database so every number agrees with the underlying apps), data points,
 * drill-down, cross-app views, combine, and a small demo query engine that
 * powers the Explore SQL editor. Mirrors handlers/vista.rs (+ demo extension).
 */
import { http, type HttpHandler } from "msw";
import { computeKpis, db, type MockDashboard } from "../db";
import {
	apiError,
	bare,
	callerId,
	checkVersion,
	created,
	jsonBody,
	noContent,
	notFound,
	ok,
	validationError,
} from "../util";

export const vistaHandlers: HttpHandler[] = [
	http.get("/api/vista/dashboards", ({ request }) => {
		if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
		return bare(db.dashboards);
	}),

	http.post("/api/vista/dashboards", async ({ request }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const body = await jsonBody<{ name: string; config?: MockDashboard["config"] }>(request);
		if (!body.name?.trim()) return validationError("Dashboard name is required");
		const now = new Date().toISOString();
		const dashboard = {
			id: nextDashboardId(),
			name: body.name.trim(),
			config: body.config ?? { widgets: [] },
			created_at: now,
			updated_at: now,
			version: 1,
		};
		db.dashboards.push(dashboard);
		return created(dashboard);
	}),

	http.get("/api/vista/dashboards/:id", ({ request, params }) => {
		if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
		const dashboard = db.dashboards.find((d) => d.id === params.id);
		return dashboard ? ok(dashboard) : notFound("Dashboard");
	}),

	http.put("/api/vista/dashboards/:id", async ({ request, params }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const dashboard = db.dashboards.find((d) => d.id === params.id);
		if (!dashboard) return notFound("Dashboard");
		const conflictResp = checkVersion(request, dashboard.version);
		if (conflictResp) return conflictResp;
		const body = await jsonBody<{ name?: string; config?: typeof dashboard.config }>(request);
		if (body.name != null) dashboard.name = body.name;
		if (body.config != null) dashboard.config = body.config;
		dashboard.updated_at = new Date().toISOString();
		dashboard.version += 1;
		return ok(dashboard);
	}),

	http.delete("/api/vista/dashboards/:id", ({ request, params }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const idx = db.dashboards.findIndex((d) => d.id === params.id);
		if (idx === -1) return notFound("Dashboard");
		db.dashboards.splice(idx, 1);
		return noContent();
	}),

	http.get("/api/vista/kpis", ({ request }) => {
		if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
		return ok(computeKpis());
	}),

	http.get("/api/vista/data-points/:metric", ({ request, params }) => {
		if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
		const limit = Number(new URL(request.url).searchParams.get("limit") ?? 30);
		const alias = metricAlias(params.metric as string);
		return bare(
			db.dataPoints
				.filter((p) => p.metric_name === alias)
				.slice(-limit),
		);
	}),

	http.post("/api/vista/drill-down", async ({ request }) => {
		if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
		const body = await jsonBody<{ metric?: string; dimension?: string }>(request);
		// Demo: drill into recent open deals / contacts / bookings by metric.
		switch (body.metric) {
			case "pipeline_value":
			case "deals_won":
				return bare(
					db.deals.slice(0, 12).map((d) => ({
						title: d.title,
						amount: d.amount,
						status: d.status,
						company: db.contacts.find((c) => c.id === d.contact_id)?.company ?? "",
					})),
				);
			case "contacts":
				return bare(db.contacts.slice(0, 12).map((c) => ({ name: c.name, company: c.company, lead_score: c.lead_score })));
			case "bookings":
				return bare(db.bookings.slice(0, 12).map((b) => ({ starts_at: b.starts_at, status: b.status })));
			default:
				return bare(
					db.activities.slice(0, 12).map((a) => ({ description: a.description, type: a.activity_type, created_at: a.created_at })),
				);
		}
	}),

	http.get("/api/vista/cross-app", ({ request }) => {
		if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
		const view = new URL(request.url).searchParams.get("view") ?? "";
		switch (view) {
			case "revenue-inventory":
				return bare(
					db.deals
						.filter((d) => d.status !== "lost")
						.slice(0, 10)
						.map((d) => {
							const contact = db.contacts.find((c) => c.id === d.contact_id);
							return {
								deal: d.title,
								amount: d.amount * (d.quantity ?? 1),
								status: d.status,
								units_requested: d.quantity ?? 1,
								low_stock_variants: db.variants.filter((v) => v.stock_quantity <= 5).length,
								company: contact?.company ?? "",
							};
						}),
				);
			case "support-sales":
				return bare(
					db.tickets.slice(0, 8).map((t) => {
						const openDeals = db.deals.filter((d) => d.status === "open").length;
						return {
							ticket: t.subject,
							priority: t.priority,
							status: t.status,
							requester: t.requester_name,
							open_pipeline_value: db.deals
								.filter((d) => d.status === "open")
								.reduce((s, d) => s + d.amount, 0),
							open_deals: openDeals,
						};
					}),
				);
			default:
				return bare([]);
		}
	}),

	http.post("/api/vista/combine", async ({ request }) => {
		if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
		const body = await jsonBody<{ primary: string; secondary: string }>(request);
		const pointsA = db.dataPoints.filter((p) => p.metric_name === metricAlias(body.primary ?? ""));
		const pointsB = db.dataPoints.filter((p) => p.metric_name === metricAlias(body.secondary ?? ""));
		const byDay = new Map<string, Record<string, number | string>>();
		for (const p of pointsA) {
			byDay.set(p.timestamp, { date: p.timestamp, [body.primary ?? "a"]: p.value });
		}
		for (const p of pointsB) {
			const row = byDay.get(p.timestamp) ?? { date: p.timestamp };
			row[body.secondary ?? "b"] = p.value;
			byDay.set(p.timestamp, row);
		}
		return bare([...byDay.values()]);
	}),

	// ------------------------------------------------------------------ demo SQL
	// Powers the Explore page. Supports a pragmatic subset:
	//   SELECT <cols|*> FROM contacts|deals|products|tickets|employees [LIMIT n]
	// The production wiring routes this to the Postgres read replica (documented
	// in ATAQU_BLUEPRINT.md → "Explore / SQL").
	http.post("/api/vista/query", async ({ request }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const body = await jsonBody<{ query: string }>(request);
		const sql = (body.query ?? "").trim();
		if (!sql) return validationError("Enter a query");
		const match = /^select\s+([\w*,\s]+?)\s+from\s+(contacts|deals|products|tickets|employees|workflows)(?:\s+limit\s+(\d+))?$/i.exec(
			sql.replace(/;+$/, ""),
		);
		if (!match) {
			return validationError(
				"Demo engine supports: SELECT * FROM contacts|deals|products|tickets|employees|workflows [LIMIT n]",
			);
		}
		const [, colsRaw, table, limitRaw] = match;
		const cols = colsRaw.split(",").map((c) => c.trim().toLowerCase());
		const limit = Math.min(Number(limitRaw ?? 25), 200);
		const { rows, columns } = tableRows(table, limit);
		const projected =
			cols.includes("*") ? columns : columns.filter((c) => cols.includes(c.toLowerCase()));
		return ok({
			columns: projected,
			rows: rows.map((r) =>
				Object.fromEntries(
					projected.map((c) => [c, (r as Record<string, unknown>)[c]]),
				),
			),
			row_count: rows.length,
			execution_ms: Math.round((Math.random() * 20 + 4) * 10) / 10,
		});
	}),
];

function metricAlias(metric: string): string {
	const aliases: Record<string, string> = {
		revenue: "revenue",
		pipeline_value: "pipeline_value",
		"pipeline value": "pipeline_value",
		stock_level: "stock_level",
		"stock level": "stock_level",
		deals_won: "deals_won",
		contacts: "contacts",
		bookings: "bookings",
		support_tickets: "support_tickets",
		leave_requests: "leave_requests",
	};
	return aliases[metric.toLowerCase()] ?? metric.toLowerCase();
}

function tableRows(table: string, limit: number) {
	switch (table) {
		case "contacts":
			return {
				columns: ["id", "name", "email", "company", "lead_score"],
				rows: db.contacts.slice(0, limit).map((c) => ({
					id: c.id, name: c.name, email: c.email, company: c.company ?? "", lead_score: c.lead_score ?? 0,
				})),
			};
		case "deals":
			return {
				columns: ["id", "title", "amount", "status", "company"],
				rows: db.deals.slice(0, limit).map((d) => ({
					id: d.id, title: d.title, amount: d.amount, status: d.status,
					company: db.contacts.find((c) => c.id === d.contact_id)?.company ?? "",
				})),
			};
		case "products":
			return {
				columns: ["id", "name", "sku", "variants"],
				rows: db.products.slice(0, limit).map((p) => ({
					id: p.id, name: p.name, sku: p.sku,
					variants: db.variants.filter((v) => v.product_id === p.id).length,
				})),
			};
		case "tickets":
			return {
				columns: ["id", "subject", "status", "priority"],
				rows: db.tickets.slice(0, limit).map((t) => ({ id: t.id, subject: t.subject, status: t.status, priority: t.priority })),
			};
		case "employees":
			return {
				columns: ["id", "full_name", "job_title", "department"],
				rows: db.employees.slice(0, limit).map((e) => ({
					id: e.id, full_name: e.full_name, job_title: e.job_title, department: e.department ?? "",
				})),
			};
		default:
			return {
				columns: ["id", "name", "is_active", "trigger"],
				rows: db.workflows.slice(0, limit).map((w) => ({
					id: w.id, name: w.name, is_active: w.is_active, trigger: w.trigger.type,
				})),
			};
	}
}

function nextDashboardId() {
	return `dsh-${String(db.dashboards.length + 1).padStart(3, "0")}-${crypto.randomUUID().slice(0, 4)}`;
}
