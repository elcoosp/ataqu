/**
 * SPARK (automation) handlers — workflows, runs (incl. the approve route the
 * SPA calls), DLQ. Mirrors crates/ataqu-api handlers/spark.rs plus the
 * `/workflows/runs/:runId/approve` route the SPA expects.
 */
import { http, type HttpHandler } from "msw";
import { audit, db, nextId } from "../db";
import {
	apiError,
	callerId,
	checkVersion,
	created,
	jsonBody,
	listParams,
	noContent,
	notFound,
	ok,
	page,
	validationError,
} from "../util";

export const sparkHandlers: HttpHandler[] = [
	http.get("/api/spark/workflows", ({ request }) => {
		if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
		const rows = [...db.workflows].sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
		return page(rows, listParams(request, 100));
	}),

	http.post("/api/spark/workflows", async ({ request }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const body = await jsonBody<{
			name: string;
			trigger: { type: string; path?: string; cron?: string; event_type?: string };
			conditions?: unknown[];
			actions?: unknown[];
		}>(request);
		if (!body.name?.trim() || !body.trigger) {
			return validationError("Name and trigger are required");
		}
		const now = new Date().toISOString();
		const workflow = {
			id: nextId("wf"),
			name: body.name.trim(),
			trigger: normalizeTrigger(body.trigger),
			conditions: (body.conditions ?? []) as never[],
			actions: (body.actions ?? []) as never[],
			is_active: false,
			webhook_secret: body.trigger.type === "webhook" ? `whsec_${Math.floor(Math.random() * 10 ** 6)}` : undefined,
			created_at: now,
			updated_at: now,
			version: 1,
		};
		db.workflows.push(workflow);
		audit(actor, "workflow.create", "spark", "workflow", workflow.id, { name: workflow.name });
		return created(workflow);
	}),

	http.get("/api/spark/workflows/runs", ({ request }) => {
		if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
		const url = new URL(request.url);
		const workflowId = url.searchParams.get("workflow_id");
		let rows = [...db.runs].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
		if (workflowId) rows = rows.filter((r) => r.workflow_id === workflowId);
		return page(rows, listParams(request, 50));
	}),

	// NOTE: /runs must be registered before /:id so "runs" is not eaten as an id.
	http.get("/api/spark/workflows/:id", ({ request, params }) => {
		if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
		const workflow = db.workflows.find((w) => w.id === params.id);
		return workflow ? ok(workflow) : notFound("Workflow");
	}),

	http.put("/api/spark/workflows/:id", async ({ request, params }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const workflow = db.workflows.find((w) => w.id === params.id);
		if (!workflow) return notFound("Workflow");
		const conflictResp = checkVersion(request, workflow.version);
		if (conflictResp) return conflictResp;
		const body = await jsonBody<{
			name?: string;
			is_active?: boolean;
			trigger?: { type: string; path?: string; cron?: string; event_type?: string };
			conditions?: unknown[];
			actions?: unknown[];
		}>(request);
		if (body.name != null) workflow.name = body.name;
		if (body.is_active != null) workflow.is_active = body.is_active;
		if (body.trigger != null) workflow.trigger = normalizeTrigger(body.trigger);
		if (body.conditions != null) workflow.conditions = body.conditions as never[];
		if (body.actions != null) workflow.actions = body.actions as never[];
		workflow.updated_at = new Date().toISOString();
		workflow.version += 1;
		audit(actor, "workflow.update", "spark", "workflow", workflow.id, body);
		return ok(workflow);
	}),

	http.delete("/api/spark/workflows/:id", ({ request, params }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const idx = db.workflows.findIndex((w) => w.id === params.id);
		if (idx === -1) return notFound("Workflow");
		db.workflows.splice(idx, 1);
		audit(actor, "workflow.delete", "spark", "workflow", params.id as string);
		return noContent();
	}),

	http.post("/api/spark/workflows/:id/execute", async ({ request, params }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const workflow = db.workflows.find((w) => w.id === params.id);
		if (!workflow) return notFound("Workflow");
		const body = await jsonBody<{ payload?: Record<string, unknown> }>(request);
		const needsApproval = workflow.actions.some((a) => a.type === "request_approval");
		const now = new Date().toISOString();
		const run = {
			id: nextId("run"),
			workflow_id: workflow.id,
			status: needsApproval ? ("pending_approval" as const) : ("running" as const),
			payload: body.payload ?? {},
			created_at: now,
			updated_at: now,
		};
		db.runs.unshift(run);
		if (needsApproval) {
			db.pendingApprovals.push({
				id: nextId("apv"),
				tenant_id: db.tenant.id,
				workflow_id: workflow.id,
				run_id: run.id,
				approver_role: "admin",
				status: "pending",
				created_at: now,
			});
		}
		audit(actor, "workflow.execute", "spark", "workflow", workflow.id);
		return created(run);
	}),

	http.get("/api/spark/workflows/runs/:runId", ({ request, params }) => {
		if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
		const run = db.runs.find((r) => r.id === params.runId);
		return run ? ok(run) : notFound("Run");
	}),

	http.post("/api/spark/workflows/runs/:runId/approve", ({ request, params }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const run = db.runs.find((r) => r.id === params.runId);
		if (!run) return notFound("Run");
		run.status = "approved";
		run.updated_at = new Date().toISOString();
		const approval = db.pendingApprovals.find((a) => a.run_id === run.id);
		if (approval) approval.status = "approved";
		audit(actor, "workflow.approve", "spark", "run", run.id);
		return ok({ approved: true });
	}),

	http.get("/api/spark/dlq", ({ request }) => {
		if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
		const rows = [...db.dlq].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
		return page(rows, listParams(request, 50));
	}),

	http.post("/api/spark/dlq/:id/replay", ({ request, params }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const entry = db.dlq.find((e) => e.id === params.id);
		if (!entry) return notFound("DLQ entry");
		db.dlq = db.dlq.filter((e) => e.id !== entry.id);
		audit(actor, "dlq.replay", "spark", "dlq", entry.id);
		return noContent();
	}),

	http.delete("/api/spark/dlq/:id", ({ request, params }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const idx = db.dlq.findIndex((e) => e.id === params.id);
		if (idx === -1) return notFound("DLQ entry");
		db.dlq.splice(idx, 1);
		audit(actor, "dlq.delete", "spark", "dlq", params.id as string);
		return noContent();
	}),
];

function normalizeTrigger(t: { type: string; path?: string; cron?: string; event_type?: string }) {
	switch (t.type) {
		case "webhook":
			return { type: "webhook" as const, path: t.path ?? `hook-${Math.floor(Math.random() * 10_000)}` };
		case "schedule":
			return { type: "schedule" as const, cron: t.cron ?? "0 * * * *" };
		default:
			return { type: "event" as const, event_type: t.event_type ?? "custom.event" };
	}
}
