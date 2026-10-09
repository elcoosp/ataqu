/**
 * PIVOT (docs + databases) handlers. Mirrors crates/ataqu-api handlers/pivot.rs.
 * List endpoints return bare arrays (exactly what packages/api-client declares).
 */
import { http, type HttpHandler } from "msw";
import { audit, bump, db, nextId } from "../db";
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

export const pivotHandlers: HttpHandler[] = [
	// ------------------------------------------------------------------ docs
	http.get("/api/pivot/docs", ({ request }) => {
		if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
		return bare([...db.documents].sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1)));
	}),

	http.post("/api/pivot/docs", async ({ request }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const body = await jsonBody<{ title: string; content: string }>(request);
		const now = new Date().toISOString();
		const doc = {
			id: nextId("doc"),
			title: body.title?.trim() || "Untitled",
			content: body.content ?? "",
			created_at: now,
			updated_at: now,
			version: 1,
		};
		db.documents.push(doc);
		audit(actor, "document.create", "pivot", "document", doc.id, { title: doc.title });
		return created(doc);
	}),

	http.post("/api/pivot/docs/bulk-delete", async ({ request }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const { ids } = await jsonBody<{ ids: string[] }>(request);
		db.documents = db.documents.filter((d) => !ids?.includes(d.id));
		audit(actor, "document.bulk_delete", "pivot", "document", undefined, { count: ids?.length ?? 0 });
		return noContent();
	}),

	http.get("/api/pivot/docs/:id", ({ request, params }) => {
		if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
		const doc = db.documents.find((d) => d.id === params.id);
		return doc ? ok(doc) : notFound("Document");
	}),

	http.put("/api/pivot/docs/:id", async ({ request, params }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const doc = db.documents.find((d) => d.id === params.id);
		if (!doc) return notFound("Document");
		const conflictResp = checkVersion(request, doc.version);
		if (conflictResp) return conflictResp;
		const body = await jsonBody<{ title?: string | null; content?: string | null }>(request);
		if (body.title != null) doc.title = body.title;
		if (body.content != null) doc.content = body.content;
		doc.updated_at = new Date().toISOString();
		const v = bump(doc);
		db.docVersions.push({
			id: nextId("dvr"),
			document_id: doc.id,
			title: doc.title,
			content: doc.content,
			version: v,
			created_at: doc.updated_at,
		});
		audit(actor, "document.update", "pivot", "document", doc.id);
		return ok({ ...doc, version: v });
	}),

	http.delete("/api/pivot/docs/:id", ({ request, params }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const idx = db.documents.findIndex((d) => d.id === params.id);
		if (idx === -1) return notFound("Document");
		db.documents.splice(idx, 1);
		audit(actor, "document.delete", "pivot", "document", params.id as string);
		return noContent();
	}),

	http.get("/api/pivot/docs/:id/versions", ({ request, params }) => {
		if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
		return bare(
			db.docVersions
				.filter((v) => v.document_id === params.id)
				.sort((a, b) => b.version - a.version)
				.map((v) => ({
					id: v.id,
					title: v.title,
					content: v.content,
					version: v.version,
					created_at: v.created_at,
				})),
		);
	}),

	http.get("/api/pivot/search", ({ request }) => {
		if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
		const qs = (new URL(request.url).searchParams.get("q") ?? "").toLowerCase();
		return bare(
			db.documents.filter(
				(d) =>
					d.title.toLowerCase().includes(qs) ||
					d.content.toLowerCase().includes(qs),
			),
		);
	}),

	// -------------------------------------------------------------- databases
	http.get("/api/pivot/databases", ({ request }) => {
		if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
		return bare(db.databases);
	}),

	http.post("/api/pivot/databases", async ({ request }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const body = await jsonBody<{ name: string }>(request);
		if (!body.name?.trim()) return validationError("Database name is required");
		const database = { id: nextId("pdb"), name: body.name.trim(), created_at: new Date().toISOString() };
		db.databases.push(database);
		audit(actor, "database.create", "pivot", "database", database.id, { name: database.name });
		return created(database);
	}),

	http.get("/api/pivot/databases/:id", ({ request, params }) => {
		if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
		const database = db.databases.find((d) => d.id === params.id);
		return database ? ok(database) : notFound("Database");
	}),

	http.delete("/api/pivot/databases/:id", ({ request, params }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const idx = db.databases.findIndex((d) => d.id === params.id);
		if (idx === -1) return notFound("Database");
		db.databases.splice(idx, 1);
		db.databaseRows = db.databaseRows.filter((r) => r.database_id !== params.id);
		audit(actor, "database.delete", "pivot", "database", params.id as string);
		return noContent();
	}),

	http.get("/api/pivot/databases/:id/rows", ({ request, params }) => {
		if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
		return bare(db.databaseRows.filter((r) => r.database_id === params.id));
	}),

	http.post("/api/pivot/databases/:databaseId/rows", async ({ request, params }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const database = db.databases.find((d) => d.id === params.databaseId);
		if (!database) return notFound("Database");
		const body = await jsonBody<Record<string, unknown>>(request);
		// The grid sends the row payload directly ({Name: …}) — historically it
		// wrapped it in {values: …}; unwrap defensively for stale builds.
		const data = (body as { values?: Record<string, unknown> }).values ?? body;
		const row = {
			id: nextId("row"),
			database_id: database.id,
			data,
			created_at: new Date().toISOString(),
		};
		db.databaseRows.push(row);
		audit(actor, "row.create", "pivot", "database_row", row.id);
		return created(row);
	}),

	http.patch("/api/pivot/databases/:databaseId/rows/:rowId", async ({ request, params }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const row = db.databaseRows.find((r) => r.id === params.rowId);
		if (!row) return notFound("Row");
		const body = await jsonBody<Record<string, unknown>>(request);
		const data = (body as { values?: Record<string, unknown> }).values ?? body;
		row.data = { ...row.data, ...data };
		audit(actor, "row.update", "pivot", "database_row", row.id, data);
		return ok(row);
	}),

	// ----------------------------------------------------------------- blocks
	http.get("/api/pivot/docs/:documentId/blocks", ({ request, params }) => {
		if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
		return bare(db.blocks.filter((b) => b.document_id === params.documentId));
	}),

	http.post("/api/pivot/blocks", async ({ request }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const body = await jsonBody<{ document_id: string; block_type: "markdown" | "table" | "view" | "checklist" }>(request);
		if (!body.document_id) return validationError("document_id is required");
		const now = new Date().toISOString();
		const block = {
			id: nextId("blk"),
			document_id: body.document_id,
			block_type: body.block_type ?? "markdown",
			content: body.block_type === "checklist" ? { items: [] } : { markdown: "" },
			created_at: now,
			updated_at: now,
			version: 1,
		};
		db.blocks.push(block);
		return created(block);
	}),

	http.put("/api/pivot/blocks/:id", async ({ request, params }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const block = db.blocks.find((b) => b.id === params.id);
		if (!block) return notFound("Block");
		const conflictResp = checkVersion(request, block.version);
		if (conflictResp) return conflictResp;
		const body = await jsonBody<{ block_type?: string; content?: Record<string, unknown> }>(request);
		if (body.block_type != null) block.block_type = body.block_type as typeof block.block_type;
		if (body.content != null) block.content = body.content;
		block.updated_at = new Date().toISOString();
		const v = bump(block);
		return ok({ ...block, version: v });
	}),

	// ------------------------------------------------------------- templates
	http.get("/api/pivot/templates", ({ request }) => {
		if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
		return bare(db.templates);
	}),

	http.post("/api/pivot/templates", async ({ request }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const body = await jsonBody<{ name: string; content: string }>(request);
		if (!body.name?.trim()) return validationError("Template name is required");
		const template = { id: nextId("tpl"), name: body.name.trim(), content: body.content ?? "", created_at: new Date().toISOString() };
		db.templates.push(template);
		audit(actor, "template.create", "pivot", "template", template.id, { name: template.name });
		return created(template);
	}),

	http.post("/api/pivot/templates/:id/apply", async ({ request, params }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const template = db.templates.find((t) => t.id === params.id);
		if (!template) return notFound("Template");
		const { name } = await jsonBody<{ name?: string }>(request);
		const now = new Date().toISOString();
		const doc = {
			id: nextId("doc"),
			title: name?.trim() || template.name,
			content: template.content,
			created_at: now,
			updated_at: now,
			version: 1,
		};
		db.documents.push(doc);
		audit(actor, "template.apply", "pivot", "document", doc.id, { template: template.id });
		return created(doc);
	}),

	http.post("/api/pivot/docs/:docId/apply-template", async ({ request, params }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const doc = db.documents.find((d) => d.id === params.docId);
		if (!doc) return notFound("Document");
		const { templateId } = await jsonBody<{ templateId: string }>(request);
		const template = db.templates.find((t) => t.id === templateId);
		if (!template) return notFound("Template");
		doc.content = template.content;
		doc.updated_at = new Date().toISOString();
		const v = bump(doc);
		audit(actor, "template.apply_to_doc", "pivot", "document", doc.id, { template: template.id });
		return ok({ ...doc, version: v });
	}),

	// ------------------------------------------------------------- relations
	http.post("/api/pivot/docs/:docId/relations", async ({ request, params }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const body = await jsonBody<{ from_block_id: string; to_block_id: string; relation_type: string }>(request);
		if (!body.from_block_id || !body.to_block_id) {
			return validationError("from_block_id and to_block_id are required");
		}
		const relation = {
			id: nextId("rel"),
			from_block_id: body.from_block_id,
			to_block_id: body.to_block_id,
			relation_type: body.relation_type ?? "references",
		};
		db.relations.push(relation);
		return created(relation);
	}),

	http.get("/api/pivot/docs/:docId/relations", ({ request, params }) => {
		if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
		return bare(db.relations);
	}),

	http.delete("/api/pivot/relations/:id", ({ request, params }) => {
		const idx = db.relations.findIndex((r) => r.id === params.id);
		if (idx !== -1) db.relations.splice(idx, 1);
		return noContent();
	}),
];
