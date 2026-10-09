/**
 * PAUSE (HR) handlers — employees, onboarding tasks, leave requests,
 * documents + presigned upload simulation. Mirrors handlers/pause.rs.
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
	listParams,
	noContent,
	notFound,
	ok,
	page,
	validationError,
} from "../util";

export const pauseHandlers: HttpHandler[] = [
	// -------------------------------------------------------------- employees
	http.get("/api/pause/employees", ({ request }) => {
		if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
		const rows = [...db.employees].sort((a, b) => a.full_name.localeCompare(b.full_name));
		return page(rows, listParams(request, 100));
	}),

	http.post("/api/pause/employees", async ({ request }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const body = await jsonBody<{
			full_name: string;
			email: string;
			phone?: string;
			job_title: string;
			department?: string;
			hire_date: string;
		}>(request);
		if (!body.full_name?.trim() || !body.email?.includes("@") || !body.job_title?.trim() || !body.hire_date) {
			return validationError("full_name, email, job_title and hire_date are required");
		}
		const now = new Date().toISOString();
		const employee = {
			id: nextId("emp"),
			full_name: body.full_name.trim(),
			email: body.email,
			phone: body.phone ?? undefined,
			job_title: body.job_title.trim(),
			department: body.department ?? undefined,
			hire_date: body.hire_date,
			is_active: true,
			onboarding_tasks: ["paperwork"],
			onboarding_completed_at: null,
			created_at: now,
			updated_at: now,
			version: 1,
		};
		db.employees.push(employee);
		audit(actor, "employee.create", "pause", "employee", employee.id, { name: employee.full_name });
		return created(employee);
	}),

	http.get("/api/pause/employees/search", ({ request }) => {
		if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
		const qs = (new URL(request.url).searchParams.get("q") ?? "").toLowerCase();
		return bare(
			db.employees.filter(
				(e) =>
					e.full_name.toLowerCase().includes(qs) ||
					e.email.toLowerCase().includes(qs) ||
					e.job_title.toLowerCase().includes(qs),
			),
		);
	}),

	http.get("/api/pause/employees/:id", ({ request, params }) => {
		if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
		const employee = db.employees.find((e) => e.id === params.id);
		return employee ? ok(employee) : notFound("Employee");
	}),

	http.put("/api/pause/employees/:id", async ({ request, params }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const employee = db.employees.find((e) => e.id === params.id);
		if (!employee) return notFound("Employee");
		const conflictResp = checkVersion(request, employee.version);
		if (conflictResp) return conflictResp;
		const body = await jsonBody<{ full_name?: string; job_title?: string; department?: string }>(request);
		if (body.full_name != null) employee.full_name = body.full_name;
		if (body.job_title != null) employee.job_title = body.job_title;
		if (body.department !== undefined) employee.department = body.department ?? undefined;
		employee.updated_at = new Date().toISOString();
		const v = bump(employee);
		audit(actor, "employee.update", "pause", "employee", employee.id, body);
		return ok({ ...employee, version: v });
	}),

	http.post("/api/pause/employees/:id/deactivate", ({ request, params }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const employee = db.employees.find((e) => e.id === params.id);
		if (!employee) return notFound("Employee");
		employee.is_active = false;
		bump(employee);
		audit(actor, "employee.deactivate", "pause", "employee", employee.id);
		return noContent();
	}),

	http.post("/api/pause/employees/bulk-deactivate", async ({ request }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const { ids } = await jsonBody<{ ids: string[] }>(request);
		for (const id of ids ?? []) {
			const employee = db.employees.find((e) => e.id === id);
			if (employee) employee.is_active = false;
		}
		audit(actor, "employee.bulk_deactivate", "pause", "employee", undefined, { count: ids?.length ?? 0 });
		return noContent();
	}),

	http.post("/api/pause/employees/:id/onboarding/complete", async ({ request, params }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const employee = db.employees.find((e) => e.id === params.id);
		if (!employee) return notFound("Employee");
		const { task_id } = await jsonBody<{ task_id: string }>(request);
		if (!task_id) return validationError("task_id is required");
		if (!employee.onboarding_tasks.includes(task_id)) employee.onboarding_tasks.push(task_id);
		if (["paperwork", "equipment", "training"].every((t) => employee.onboarding_tasks.includes(t))) {
			employee.onboarding_completed_at = new Date().toISOString();
		}
		const v = bump(employee);
		audit(actor, "employee.onboarding_complete", "pause", "employee", employee.id, { task_id });
		return ok({ ...employee, version: v });
	}),

	// ------------------------------------------------------------------ leave
	http.get("/api/pause/leave-requests", ({ request }) => {
		if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
		const rows = [...db.leaves].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
		return page(rows, listParams(request, 100));
	}),

	http.post("/api/pause/leave-requests", async ({ request }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const body = await jsonBody<{
			employee_id: string;
			leave_type: "annual" | "sick" | "personal" | "unpaid";
			start_date: string;
			end_date: string;
			reason?: string;
		}>(request);
		if (!body.employee_id || !body.leave_type || !body.start_date || !body.end_date) {
			return validationError("employee_id, leave_type, start_date and end_date are required");
		}
		const employee = db.employees.find((e) => e.id === body.employee_id);
		if (!employee) return notFound("Employee");
		const now = new Date().toISOString();
		const leave = {
			id: nextId("lve"),
			employee_id: body.employee_id,
			employee_name: employee.full_name,
			leave_type: body.leave_type,
			start_date: body.start_date,
			end_date: body.end_date,
			reason: body.reason ?? undefined,
			status: "pending" as const,
			created_at: now,
			updated_at: now,
			version: 1,
		};
		db.leaves.unshift(leave);
		audit(actor, "leave.create", "pause", "leave_request", leave.id);
		return created(leave);
	}),

	http.patch("/api/pause/leave-requests/:id/approve", ({ request, params }) => reviewLeave(request, params.id as string, "approved")),
	http.patch("/api/pause/leave-requests/:id/reject", ({ request, params }) => reviewLeave(request, params.id as string, "rejected")),
	http.patch("/api/pause/leave-requests/:id/cancel", ({ request, params }) => reviewLeave(request, params.id as string, "cancelled")),

	// -------------------------------------------------------------- documents
	http.post("/api/pause/employees/:employeeId/documents", async ({ request, params }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const employee = db.employees.find((e) => e.id === params.employeeId);
		if (!employee) return notFound("Employee");
		const body = await jsonBody<{ file_name: string; file_url: string; doc_type: string }>(request);
		if (!body.file_name || !body.file_url) return validationError("file_name and file_url are required");
		const document = {
			id: nextId("hdoc"),
			employee_id: employee.id,
			file_name: body.file_name,
			file_url: body.file_url,
			doc_type: body.doc_type ?? "other",
			created_at: new Date().toISOString(),
		};
		db.hrDocuments.push(document);
		audit(actor, "document.upload", "pause", "document", document.id, { file: document.file_name });
		return created({ id: document.id, file_name: document.file_name, file_url: document.file_url, doc_type: document.doc_type, created_at: document.created_at });
	}),

	http.get("/api/pause/employees/:employeeId/documents", ({ request, params }) => {
		if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
		return bare(db.hrDocuments.filter((d) => d.employee_id === params.employeeId));
	}),

	// The S3 presigned upload: mock accepts a PUT anywhere under /api/pause/uploads.
	http.put("/api/pause/uploads/:key", () => noContent()),
];

function reviewLeave(request: Request, id: string, status: "approved" | "rejected" | "cancelled") {
	const actor = callerId(request);
	if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
	const leave = db.leaves.find((l) => l.id === id);
	if (!leave) return notFound("Leave request");
	const conflictResp = checkVersion(request, leave.version);
	if (conflictResp) return conflictResp;
	leave.status = status;
	leave.reviewer_id = actor;
	leave.reviewed_at = new Date().toISOString();
	leave.updated_at = leave.reviewed_at;
	const v = bump(leave);
	audit(actor, `leave.${status}`, "pause", "leave_request", leave.id);
	return ok({ ...leave, version: v });
}
