/**
 * SOND (forms) handlers — forms CRUD, public form funnel, submissions,
 * routing rules, exports. Mirrors handlers/sond.rs.
 */
import { http, type HttpHandler, HttpResponse } from "msw";
import { audit, bump, db, nextId, type MockForm } from "../db";
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
        validationError,
} from "../util";

export const sondHandlers: HttpHandler[] = [
        http.get("/api/sond/forms", ({ request }) => {
                if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
                const rows = [...db.forms].sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
                const params = listParams(request, 100);
                return ok({
                        items: rows.slice(params.offset, params.offset + params.limit),
                        total: rows.length,
                        limit: params.limit,
                        offset: params.offset,
                });
        }),

        http.post("/api/sond/forms", async ({ request }) => {
                const actor = callerId(request);
                if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
                const body = await jsonBody<{
                        title: string;
                        description?: string;
                        questions?: Array<Record<string, unknown>>;
                        mode?: "standard" | "conversational";
                        branding?: Record<string, unknown>;
                }>(request);
                if (!body.title?.trim()) return validationError("Form title is required");
                const now = new Date().toISOString();
                const form = {
                        id: nextId("frm"),
                        title: body.title.trim(),
                        description: body.description,
                        questions: (body.questions ?? []).map((qq, i) => ({
                                ...qq,
                                id: qq.id ?? `fq-${crypto.randomUUID().slice(0, 8)}`,
                                page: 1,
                                order: i,
                        })) as unknown as MockForm["questions"],
                        branding: body.branding ?? { accent: "#F59E0B" },
                        mode: body.mode ?? "standard",
                        status: "draft" as const,
                        created_at: now,
                        updated_at: now,
                        version: 1,
                };
                db.forms.push(form);
                audit(actor, "form.create", "sond", "form", form.id, { title: form.title });
                return created(form);
        }),

        http.get("/api/sond/forms/:id", ({ request, params }) => {
                if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
                const form = db.forms.find((f) => f.id === params.id);
                return form ? ok(form) : notFound("Form");
        }),

        // Public funnel (no auth) — only published forms are served.
        http.get("/api/sond/public/forms/:id", ({ params }) => {
                const form = db.forms.find((f) => f.id === params.id);
                if (!form || form.status !== "published") return notFound("Form");
                return ok(form);
        }),

        http.put("/api/sond/forms/:id", async ({ request, params }) => {
                const actor = callerId(request);
                if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
                const form = db.forms.find((f) => f.id === params.id);
                if (!form) return notFound("Form");
                const conflictResp = checkVersion(request, form.version);
                if (conflictResp) return conflictResp;
                const body = await jsonBody<{
                        title?: string;
                        description?: string;
                        questions?: Array<Record<string, unknown>>;
                        mode?: "standard" | "conversational";
                        status?: "draft" | "published" | "closed";
                        routing_rules?: typeof form.routing_rules;
                }>(request);
                if (body.title != null) form.title = body.title;
                if (body.description !== undefined) form.description = body.description ?? undefined;
                if (body.questions != null) {
                        form.questions = body.questions.map((qq, i) => ({
                                ...qq,
                                id: (qq.id as string) ?? `fq-${crypto.randomUUID().slice(0, 8)}`,
                                page: 1,
                                order: i,
                        })) as unknown as typeof form.questions;
                }
                if (body.mode != null) form.mode = body.mode;
                if (body.status != null) form.status = body.status;
                if (body.routing_rules !== undefined) form.routing_rules = body.routing_rules ?? undefined;
                form.updated_at = new Date().toISOString();
                const v = bump(form);
                audit(actor, "form.update", "sond", "form", form.id, { status: form.status });
                return ok({ ...form, version: v });
        }),

        http.delete("/api/sond/forms/:id", ({ request, params }) => {
                const actor = callerId(request);
                if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
                const idx = db.forms.findIndex((f) => f.id === params.id);
                if (idx === -1) return notFound("Form");
                db.forms.splice(idx, 1);
                db.submissions = db.submissions.filter((s) => s.form_id !== params.id);
                audit(actor, "form.delete", "sond", "form", params.id as string);
                return noContent();
        }),

        http.patch("/api/sond/forms/:id/routing", async ({ request, params }) => {
                const actor = callerId(request);
                if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
                const form = db.forms.find((f) => f.id === params.id);
                if (!form) return notFound("Form");
                const rules = await jsonBody<typeof form.routing_rules>(request);
                form.routing_rules = rules ?? undefined;
                form.updated_at = new Date().toISOString();
                const v = bump(form);
                audit(actor, "form.routing_update", "sond", "form", form.id);
                return ok({ ...form, version: v });
        }),

        // -------------------------------------------------------------- submissions
        http.get("/api/sond/forms/:formId/submissions", ({ request, params }) => {
                if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
                const rows = db.submissions
                        .filter((s) => s.form_id === params.formId)
                        .sort((a, b) => (a.submitted_at < b.submitted_at ? 1 : -1));
                return bare(rows);
        }),

        http.post("/api/sond/forms/:formId/submit", async ({ request, params }) => {
                const body = await jsonBody<{
                        answers: Array<{ question_id: string; value: { type: string; value: unknown } }>;
                        respondent_id?: string;
                }>(request);
                const form = db.forms.find((f) => f.id === params.formId);
                if (!form || form.status !== "published") return notFound("Form");
                if (!Array.isArray(body.answers)) return validationError("answers must be an array");
                const submission = {
                        id: nextId("sub"),
                        form_id: form.id,
                        answers: body.answers,
                        respondent_id: body.respondent_id,
                        submitted_at: new Date().toISOString(),
                };
                db.submissions.push(submission);
                return HttpResponse.json(submission, { status: 201 });
        }),

        http.post("/api/sond/forms/:formId/submit/step", async ({ request, params }) => {
                const body = await jsonBody<{ question_id: string }>(request);
                const form = db.forms.find((f) => f.id === params.formId);
                if (!form || form.status !== "published") return notFound("Form");
                const idx = form.questions.findIndex((q) => q.id === body.question_id);
                const next = form.questions
                        .filter((q, i) => i > idx && isVisible(q, form.questions))
                        .at(0);
                return ok({ is_complete: !next, next_question_id: next?.id });
        }),

        http.post("/api/sond/submissions/bulk-delete", async ({ request }) => {
                const actor = callerId(request);
                if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
                const { ids } = await jsonBody<{ ids: string[] }>(request);
                db.submissions = db.submissions.filter((s) => !ids?.includes(s.id));
                audit(actor, "submission.bulk_delete", "sond", "submission", undefined, { count: ids?.length ?? 0 });
                return noContent();
        }),

        http.get("/api/sond/forms/:formId/export", ({ request, params }) => {
                if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
                const form = db.forms.find((f) => f.id === params.formId);
                const rows = db.submissions.filter((s) => s.form_id === params.formId);
                const headers = form ? form.questions.map((q) => q.label) : ["submitted_at"];
                const csv = [
                        headers.join(","),
                        ...rows.map((s) =>
                                s.answers
                                        .map((a) => `"${String(a.value?.value ?? "").replaceAll('"', '""')}"`)
                                        .join(","),
                        ),
                ].join("\n");
                return new HttpResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8" } });
        }),
];

/** Mirrors apps/ataqu/src/apps/sond/components/preview/visibility.ts (subset). */
function isVisible(
        question: { conditions?: Array<{ question_id: string; operator: string; value: unknown }> },
        all: Array<{ id: string }>,
) {
        if (!question.conditions?.length) return true;
        return question.conditions.every((c) => {
                if (c.operator === "is_not_empty") return true;
                if (c.operator === "is_empty") return false;
                return true;
        });
}
