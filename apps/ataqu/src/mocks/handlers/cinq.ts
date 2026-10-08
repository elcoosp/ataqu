/**
 * CINQ (CRM) handlers — contacts, deals, pipeline stages, activities, tasks,
 * establishments, email tracking, CSV import/export, integration toggles.
 * Mirrors crates/ataqu-api handlers/cinq.rs.
 */
import { type HttpHandler, HttpResponse, http } from "msw";
import {
	audit,
	bump,
	db,
	type MockContact,
	type MockDeal,
	nextId,
} from "../db";
import {
	apiError,
	bare,
	callerId,
	checkVersion,
	created,
	jsonBody,
	listParams,
	noContent,
	notFound,
	ok,
	page,
	paginated,
	validationError,
} from "../util";

export const cinqHandlers: HttpHandler[] = [
	// -------------------------------------------------------------- contacts
	http.get("/api/cinq/contacts", ({ request }) => {
		if (!callerId(request))
			return apiError("UNAUTHORIZED", "Authentication required");
		const url = new URL(request.url);
		const qs = url.searchParams.get("q");
		let rows = [...db.contacts].sort((a, b) =>
			a.created_at < b.created_at ? 1 : -1,
		);
		if (qs) {
			rows = rows.filter(
				(c) =>
					c.name.toLowerCase().includes(qs.toLowerCase()) ||
					c.email.toLowerCase().includes(qs.toLowerCase()) ||
					(c.company ?? "").toLowerCase().includes(qs.toLowerCase()),
			);
		}
		return page(rows, listParams(request, 100));
	}),

	http.post("/api/cinq/contacts", async ({ request }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const body = await jsonBody<Partial<MockContact>>(request);
		if (!body.name?.trim() || !body.email?.includes("@")) {
			return validationError("Name and a valid email are required");
		}
		const now = new Date().toISOString();
		const contact: MockContact = {
			id: nextId("cnt"),
			name: body.name.trim(),
			email: body.email,
			company: body.company,
			phone: body.phone ?? undefined,
			lead_score: body.lead_score ?? 50,
			custom_fields: body.custom_fields,
			created_at: now,
			updated_at: now,
			version: 1,
		};
		db.contacts.push(contact);
		audit(actor, "contact.create", "cinq", "contact", contact.id, {
			name: contact.name,
		});
		return created(contact as unknown as Record<string, unknown>);
	}),

	http.get("/api/cinq/contacts/:id", ({ request, params }) => {
		if (!callerId(request))
			return apiError("UNAUTHORIZED", "Authentication required");
		const contact = db.contacts.find((c) => c.id === params.id);
		return contact ? ok(contact) : notFound("Contact");
	}),

	http.put("/api/cinq/contacts/:id", async ({ request, params }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const contact = db.contacts.find((c) => c.id === params.id);
		if (!contact) return notFound("Contact");
		const conflictResp = checkVersion(request, contact.version);
		if (conflictResp) return conflictResp;
		const body = await jsonBody<Partial<MockContact>>(request);
		if (body.name !== undefined && body.name !== null) contact.name = body.name;
		if (body.email !== undefined && body.email !== null)
			contact.email = body.email;
		if (body.phone !== undefined) contact.phone = body.phone ?? undefined;
		if (body.company !== undefined) contact.company = body.company ?? undefined;
		if (body.custom_fields !== undefined && body.custom_fields !== null) {
			contact.custom_fields = {
				...contact.custom_fields,
				...body.custom_fields,
			};
		}
		if (body.lead_score !== undefined && body.lead_score !== null) {
			contact.lead_score = body.lead_score;
		}
		contact.updated_at = new Date().toISOString();
		const v = bump(contact);
		audit(actor, "contact.update", "cinq", "contact", contact.id, body);
		return ok({ ...contact, version: v });
	}),

	http.delete("/api/cinq/contacts/:id", ({ request, params }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const idx = db.contacts.findIndex((c) => c.id === params.id);
		if (idx === -1) return notFound("Contact");
		db.contacts.splice(idx, 1);
		audit(actor, "contact.delete", "cinq", "contact", params.id as string);
		return noContent();
	}),

	http.post("/api/cinq/contacts/bulk-delete", async ({ request }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const { ids } = await jsonBody<{ ids: string[] }>(request);
		db.contacts = db.contacts.filter((c) => !ids?.includes(c.id));
		audit(actor, "contact.bulk_delete", "cinq", "contact", undefined, {
			count: ids?.length ?? 0,
		});
		return noContent();
	}),

	// ----------------------------------------------------------------- deals
	http.get("/api/cinq/deals", ({ request }) => {
		if (!callerId(request))
			return apiError("UNAUTHORIZED", "Authentication required");
		const url = new URL(request.url);
		const qs = url.searchParams.get("q");
		let rows = [...db.deals].sort((a, b) =>
			a.updated_at < b.updated_at ? 1 : -1,
		);
		if (qs) {
			rows = rows.filter((d) =>
				d.title.toLowerCase().includes(qs.toLowerCase()),
			);
		}
		return page(rows, listParams(request, 1000));
	}),

	http.post("/api/cinq/deals", async ({ request }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const body = await jsonBody<Partial<MockDeal>>(request);
		if (!body.title?.trim() || !body.contact_id || !body.pipeline_stage_id) {
			return validationError("Title, contact and pipeline stage are required");
		}
		const now = new Date().toISOString();
		const deal: MockDeal = {
			id: nextId("dl"),
			title: body.title.trim(),
			amount: body.amount ?? 0,
			status: "open",
			contact_id: body.contact_id,
			pipeline_stage_id: body.pipeline_stage_id,
			owner_id: body.owner_id ?? actor,
			probability: body.probability ?? 30,
			quantity: body.quantity ?? 1,
			created_at: now,
			updated_at: now,
			version: 1,
		};
		db.deals.push(deal);
		audit(actor, "deal.create", "cinq", "deal", deal.id, { title: deal.title });
		return created(deal as unknown as Record<string, unknown>);
	}),

	http.get("/api/cinq/deals/:id", ({ request, params }) => {
		if (!callerId(request))
			return apiError("UNAUTHORIZED", "Authentication required");
		const deal = db.deals.find((d) => d.id === params.id);
		return deal ? ok(deal) : notFound("Deal");
	}),

	http.put("/api/cinq/deals/:id", async ({ request, params }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const deal = db.deals.find((d) => d.id === params.id);
		if (!deal) return notFound("Deal");
		const conflictResp = checkVersion(request, deal.version);
		if (conflictResp) return conflictResp;
		const body = await jsonBody<Partial<MockDeal>>(request);
		if (body.title != null) deal.title = body.title;
		if (body.amount != null) deal.amount = body.amount;
		if (body.status != null) deal.status = body.status;
		if (body.contact_id != null) deal.contact_id = body.contact_id;
		if (body.pipeline_stage_id != null)
			deal.pipeline_stage_id = body.pipeline_stage_id;
		if (body.owner_id !== undefined) deal.owner_id = body.owner_id ?? undefined;
		if (body.probability != null) deal.probability = body.probability;
		if (body.quantity != null) deal.quantity = body.quantity;
		deal.updated_at = new Date().toISOString();
		const v = bump(deal);
		audit(actor, "deal.update", "cinq", "deal", deal.id, body);
		return ok({ ...deal, version: v });
	}),

	http.delete("/api/cinq/deals/:id", ({ request, params }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const idx = db.deals.findIndex((d) => d.id === params.id);
		if (idx === -1) return notFound("Deal");
		db.deals.splice(idx, 1);
		audit(actor, "deal.delete", "cinq", "deal", params.id as string);
		return noContent();
	}),

	http.post("/api/cinq/deals/bulk-delete", async ({ request }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const { ids } = await jsonBody<{ ids: string[] }>(request);
		db.deals = db.deals.filter((d) => !ids?.includes(d.id));
		audit(actor, "deal.bulk_delete", "cinq", "deal", undefined, {
			count: ids?.length ?? 0,
		});
		return noContent();
	}),

	// -------------------------------------------------------------- pipeline
	http.get("/api/cinq/pipeline/stages", ({ request }) => {
		if (!callerId(request))
			return apiError("UNAUTHORIZED", "Authentication required");
		return ok([...db.stages].sort((a, b) => a.order - b.order));
	}),

	http.post("/api/cinq/pipeline/stages", async ({ request }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const body = await jsonBody<{ name: string; order: number }>(request);
		if (!body.name?.trim()) return validationError("Stage name is required");
		const stage = {
			id: nextId("stg"),
			name: body.name.trim(),
			order: body.order ?? db.stages.length + 1,
			version: 1,
		};
		db.stages.push(stage);
		audit(actor, "stage.create", "cinq", "stage", stage.id, {
			name: stage.name,
		});
		return created(stage as unknown as Record<string, unknown>);
	}),

	http.put("/api/cinq/pipeline/stages/:id", async ({ request, params }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const stage = db.stages.find((s) => s.id === params.id);
		if (!stage) return notFound("Stage");
		const conflictResp = checkVersion(request, stage.version);
		if (conflictResp) return conflictResp;
		const body = await jsonBody<{ name?: string; order?: number }>(request);
		if (body.name != null) stage.name = body.name;
		if (body.order != null) stage.order = body.order;
		const v = bump(stage);
		audit(actor, "stage.update", "cinq", "stage", stage.id, body);
		return ok({ ...stage, version: v });
	}),

	http.delete("/api/cinq/pipeline/stages/:id", ({ request, params }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const idx = db.stages.findIndex((s) => s.id === params.id);
		if (idx === -1) return notFound("Stage");
		db.stages.splice(idx, 1);
		audit(actor, "stage.delete", "cinq", "stage", params.id as string);
		return noContent();
	}),

	// ------------------------------------------------------------ activities
	http.get("/api/cinq/activities", ({ request }) => {
		if (!callerId(request))
			return apiError("UNAUTHORIZED", "Authentication required");
		const contactId = new URL(request.url).searchParams.get("contact_id");
		let rows = [...db.activities].sort((a, b) =>
			a.created_at < b.created_at ? 1 : -1,
		);
		if (contactId) rows = rows.filter((a) => a.contact_id === contactId);
		return page(rows, listParams(request, 100));
	}),

	http.post("/api/cinq/activities", async ({ request }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const body = await jsonBody<{
			contact_id: string;
			deal_id?: string;
			activity_type: MockActivity2["activity_type"];
			description: string;
			scheduled_at?: string;
		}>(request);
		if (!body.contact_id || !body.description?.trim()) {
			return validationError("Contact and description are required");
		}
		const activity = {
			id: nextId("act"),
			activity_type: body.activity_type ?? "note",
			description: body.description.trim(),
			scheduled_at: body.scheduled_at,
			contact_id: body.contact_id,
			deal_id: body.deal_id,
			created_at: new Date().toISOString(),
		};
		db.activities.push(activity);
		audit(actor, "activity.create", "cinq", "activity", activity.id);
		return created(activity as unknown as Record<string, unknown>);
	}),

	http.get("/api/cinq/activities/:id", ({ request, params }) => {
		if (!callerId(request))
			return apiError("UNAUTHORIZED", "Authentication required");
		const activity = db.activities.find((a) => a.id === params.id);
		return activity ? ok(activity) : notFound("Activity");
	}),

	// ----------------------------------------------------------------- tasks
	http.get("/api/cinq/tasks", ({ request }) => {
		if (!callerId(request))
			return apiError("UNAUTHORIZED", "Authentication required");
		return bare(
			[...db.tasks].sort((a, b) =>
				(a.due_date ?? "") > (b.due_date ?? "") ? 1 : -1,
			),
		);
	}),

	http.post("/api/cinq/tasks", async ({ request }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const body = await jsonBody<Record<string, never>>(request);
		const payload = body as unknown as {
			title: string;
			description?: string;
			due_date?: string;
			contact_id?: string;
			deal_id?: string;
			assigned_to?: string;
		};
		if (!payload.title?.trim())
			return validationError("Task title is required");
		const now = new Date().toISOString();
		const task = {
			id: nextId("tsk"),
			title: payload.title.trim(),
			description: payload.description,
			due_date: payload.due_date,
			status: "pending" as const,
			contact_id: payload.contact_id,
			deal_id: payload.deal_id,
			assigned_to: payload.assigned_to ?? actor,
			created_at: now,
			updated_at: now,
			version: 1,
		};
		db.tasks.push(task);
		audit(actor, "task.create", "cinq", "task", task.id, { title: task.title });
		return created(task as unknown as Record<string, unknown>);
	}),

	http.get("/api/cinq/tasks/:id", ({ request, params }) => {
		if (!callerId(request))
			return apiError("UNAUTHORIZED", "Authentication required");
		const task = db.tasks.find((t) => t.id === params.id);
		return task ? ok(task) : notFound("Task");
	}),

	http.put("/api/cinq/tasks/:id", async ({ request, params }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const task = db.tasks.find((t) => t.id === params.id);
		if (!task) return notFound("Task");
		const conflictResp = checkVersion(request, task.version);
		if (conflictResp) return conflictResp;
		const body = await jsonBody<Record<string, unknown>>(request);
		if (body.title != null) task.title = body.title as string;
		if (body.description !== undefined)
			task.description = (body.description as string) ?? undefined;
		if (body.due_date !== undefined)
			task.due_date = (body.due_date as string) ?? undefined;
		if (body.status != null) task.status = body.status as typeof task.status;
		task.updated_at = new Date().toISOString();
		const v = bump(task);
		audit(actor, "task.update", "cinq", "task", task.id, body);
		return ok({ ...task, version: v });
	}),

	http.delete("/api/cinq/tasks/:id", ({ request, params }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const idx = db.tasks.findIndex((t) => t.id === params.id);
		if (idx === -1) return notFound("Task");
		db.tasks.splice(idx, 1);
		audit(actor, "task.delete", "cinq", "task", params.id as string);
		return noContent();
	}),

	http.post("/api/cinq/tasks/bulk-delete", async ({ request }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const { ids } = await jsonBody<{ ids: string[] }>(request);
		db.tasks = db.tasks.filter((t) => !ids?.includes(t.id));
		audit(actor, "task.bulk_delete", "cinq", "task", undefined, {
			count: ids?.length ?? 0,
		});
		return noContent();
	}),

	http.get("/api/cinq/contacts/:contactId/tasks", ({ request, params }) => {
		if (!callerId(request))
			return apiError("UNAUTHORIZED", "Authentication required");
		return bare(db.tasks.filter((t) => t.contact_id === params.contactId));
	}),

	// --------------------------------------------------------------- search
	http.get("/api/cinq/search", ({ request }) => {
		if (!callerId(request))
			return apiError("UNAUTHORIZED", "Authentication required");
		const qs = new URL(request.url).searchParams.get("q") ?? "";
		return bare(
			db.contacts.filter(
				(c) =>
					c.name.toLowerCase().includes(qs.toLowerCase()) ||
					c.email.toLowerCase().includes(qs.toLowerCase()) ||
					(c.company ?? "").toLowerCase().includes(qs.toLowerCase()),
			),
		);
	}),

	http.get("/api/cinq/search/custom", ({ request }) => {
		if (!callerId(request))
			return apiError("UNAUTHORIZED", "Authentication required");
		const url = new URL(request.url);
		const field = url.searchParams.get("field") ?? "";
		const value = (url.searchParams.get("value") ?? "").toLowerCase();
		return bare(
			db.contacts.filter((c) =>
				String(c.custom_fields?.[field] ?? "")
					.toLowerCase()
					.includes(value),
			),
		);
	}),

	http.get("/api/cinq/search/custom/cross", ({ request }) => {
		if (!callerId(request))
			return apiError("UNAUTHORIZED", "Authentication required");
		const value = (
			new URL(request.url).searchParams.get("q") ?? ""
		).toLowerCase();
		if (!value) return bare([]);
		return bare(
			db.contacts.filter((c) =>
				Object.values(c.custom_fields ?? {}).some((v) =>
					String(v).toLowerCase().includes(value),
				),
			),
		);
	}),

	// ------------------------------------------------------------------- csv
	http.post("/api/cinq/csv/import", async ({ request }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const form = await request.formData();
		const file = form.get("file");
		if (!(file instanceof File))
			return validationError("A CSV file is required");
		const text = await file.text();
		const lines = text.split(/\r?\n/).filter(Boolean);
		const header = (lines[0] ?? "")
			.split(",")
			.map((h) => h.trim().toLowerCase());
		const nameIdx = header.indexOf("name");
		const emailIdx = header.indexOf("email");
		const companyIdx = header.indexOf("company");
		let imported = 0;
		let failed = 0;
		const failedRows: Array<[number, string]> = [];
		lines.slice(1).forEach((line, i) => {
			const cols = line.split(",");
			const name = nameIdx >= 0 ? cols[nameIdx]?.trim() : "";
			const email = emailIdx >= 0 ? cols[emailIdx]?.trim() : "";
			if (!name || !email?.includes("@")) {
				failed += 1;
				failedRows.push([i + 2, "Missing name or valid email"]);
				return;
			}
			const now = new Date().toISOString();
			db.contacts.push({
				id: nextId("cnt"),
				name,
				email,
				company: companyIdx >= 0 ? cols[companyIdx]?.trim() : undefined,
				lead_score: 50,
				created_at: now,
				updated_at: now,
				version: 1,
			});
			imported += 1;
		});
		audit(actor, "contact.csv_import", "cinq", "contact", undefined, {
			imported,
			failed,
		});
		return ok({ imported, failed, failed_rows: failedRows });
	}),

	http.get("/api/cinq/csv/export", ({ request }) => {
		if (!callerId(request))
			return apiError("UNAUTHORIZED", "Authentication required");
		return csvResponse(
			["name", "email", "company", "phone", "lead_score"],
			db.contacts.map((c) => [
				c.name,
				c.email,
				c.company ?? "",
				c.phone ?? "",
				String(c.lead_score ?? ""),
			]),
		);
	}),

	http.get("/api/cinq/deals/export", ({ request }) => {
		if (!callerId(request))
			return apiError("UNAUTHORIZED", "Authentication required");
		return csvResponse(
			["title", "amount", "status", "stage"],
			db.deals.map((d) => [
				d.title,
				String(d.amount),
				d.status,
				db.stages.find((s) => s.id === d.pipeline_stage_id)?.name ?? "",
			]),
		);
	}),

	// -------------------------------------------------------------- tracking
	http.post("/api/cinq/email/track", async ({ request }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const body = await jsonBody<{
			contact_id: string;
			event_type: "open" | "click" | "bounce" | "send" | "deliver";
			metadata?: Record<string, unknown>;
		}>(request);
		if (!body.contact_id || !body.event_type) {
			return validationError("contact_id and event_type are required");
		}
		db.tracking.push({
			id: nextId("trk"),
			contact_id: body.contact_id,
			event_type: body.event_type,
			metadata: body.metadata,
			created_at: new Date().toISOString(),
		});
		return noContent();
	}),

	http.get("/api/cinq/contacts/:contactId/tracking", ({ request, params }) => {
		if (!callerId(request))
			return apiError("UNAUTHORIZED", "Authentication required");
		const rows = db.tracking
			.filter((t) => t.contact_id === params.contactId)
			.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
		const params2 = listParams(request, 50);
		return ok({ items: rows.slice(0, params2.limit), total: rows.length });
	}),

	// ---------------------------------------------------------- integrations
	http.get("/api/cinq/integrations/:integration", ({ request, params }) => {
		if (!callerId(request))
			return apiError("UNAUTHORIZED", "Authentication required");
		const integration = String(params.integration);
		const existing = db.integrationToggles.find(
			(t) => t.integration === integration,
		);
		return ok({
			integration,
			enabled: existing?.enabled ?? false,
			updated_at: new Date().toISOString(),
		});
	}),
	http.post("/api/cinq/integrations/toggle", async ({ request }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const body = await jsonBody<{ integration: string; enabled: boolean }>(
			request,
		);
		if (!body.integration) return validationError("integration is required");
		const existing = db.integrationToggles.find(
			(t) => t.integration === body.integration,
		);
		if (existing) existing.enabled = body.enabled;
		else
			db.integrationToggles.push({
				integration: body.integration,
				enabled: body.enabled,
			});
		audit(
			actor,
			"integration.toggle",
			"cinq",
			"integration",
			body.integration,
			body,
		);
		return ok({ integration: body.integration, enabled: body.enabled });
	}),

	// -------------------------------------------------------- establishments
	http.get("/api/cinq/establishments", ({ request }) => {
		if (!callerId(request))
			return apiError("UNAUTHORIZED", "Authentication required");
		return bare(db.establishments);
	}),

	http.post("/api/cinq/establishments", async ({ request }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const body = await jsonBody<{
			company_name: string;
			siret?: string;
			address?: string;
		}>(request);
		if (!body.company_name?.trim())
			return validationError("Company name is required");
		const now = new Date().toISOString();
		const establishment = {
			id: nextId("est"),
			company_name: body.company_name.trim(),
			siret: body.siret,
			address: body.address,
			created_at: now,
			updated_at: now,
		};
		db.establishments.push(establishment);
		audit(
			actor,
			"establishment.create",
			"cinq",
			"establishment",
			establishment.id,
		);
		return created(establishment as unknown as Record<string, unknown>);
	}),
];

// Type alias to avoid importing MockActivity's contract in the POST above.
type MockActivity2 = {
	activity_type: "call" | "email" | "meeting" | "task" | "note";
};

function csvResponse(headers: string[], rows: string[][]) {
	const csv = [
		headers.join(","),
		...rows.map((r) => r.map((c) => `"${c.replaceAll('"', '""')}"`).join(",")),
	].join("\n");
	return new HttpResponse(csv, {
		headers: {
			"Content-Type": "text/csv; charset=utf-8",
			"Content-Disposition": `attachment; filename="export-${Date.now()}.csv"`,
		},
	});
}
