/**
 * DIAL (chat + support) handlers — channels, messages, threads, mentions,
 * reactions, presence, search, export blobs, tickets and the CINQ context
 * side-panel. Mirrors crates/ataqu-api handlers/dial.rs.
 */
import { http, type HttpHandler, type PathParams, HttpResponse } from "msw";
import { ADMIN_ID, audit, bump, db, nextId } from "../db";
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

export const dialHandlers: HttpHandler[] = [
	// -------------------------------------------------------------- channels
	http.get("/api/dial/channels", ({ request }) => {
		if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
		// The channel sidebar groups by `type` and renders unread badges — the
		// list serializer therefore carries the extended summary fields.
		const rows = [...db.channels]
			.filter((c) => !c.archived_at)
			.sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))
			.map((c) => ({
				id: c.id,
				name: c.name,
				type: c.channel_type,
				unread_count: c.unread_count,
				participants: c.participants,
				updated_at: c.updated_at,
			}));
		return page(rows, listParams(request, 100));
	}),

	http.post("/api/dial/channels", async ({ request }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const body = await jsonBody<{
			name: string;
			channel_type?: "public" | "private" | "direct_message";
			participants?: string[];
		}>(request);
		if (!body.name?.trim()) return validationError("Channel name is required");
		const now = new Date().toISOString();
		const channel = {
			id: nextId("chn"),
			name: body.name.trim(),
			channel_type: body.channel_type ?? "public",
			version: 1,
			created_by: actor,
			participants: body.participants?.length ? body.participants : [actor],
			unread_count: 0,
			created_at: now,
			updated_at: now,
			archived_at: null,
		};
		db.channels.push(channel);
		audit(actor, "channel.create", "dial", "channel", channel.id, { name: channel.name });
		return created(channel);
	}),

	http.get("/api/dial/channels/:id", ({ request, params }) => {
		if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
		const channel = db.channels.find((c) => c.id === params.id);
		return channel ? ok(channel) : notFound("Channel");
	}),

	http.put("/api/dial/channels/:id", async ({ request, params }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const channel = db.channels.find((c) => c.id === params.id);
		if (!channel) return notFound("Channel");
		const conflictResp = checkVersion(request, channel.version);
		if (conflictResp) return conflictResp;
		const body = await jsonBody<{ name?: string }>(request);
		if (body.name?.trim()) channel.name = body.name.trim();
		channel.updated_at = new Date().toISOString();
		const v = bump(channel);
		audit(actor, "channel.rename", "dial", "channel", channel.id, body);
		return ok({ ...channel, version: v });
	}),

	http.post("/api/dial/channels/:id/archive", ({ request, params }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const channel = db.channels.find((c) => c.id === params.id);
		if (!channel) return notFound("Channel");
		channel.archived_at = new Date().toISOString();
		bump(channel);
		audit(actor, "channel.archive", "dial", "channel", channel.id);
		return noContent();
	}),

	// -------------------------------------------------------------- messages
	http.get("/api/dial/channels/:channelId/messages", ({ request, params }) => {
		if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
		const rows = db.messages
			.filter((m) => m.channel_id === params.channelId && !m.deleted_at)
			.sort((a, b) => (a.sent_at < b.sent_at ? -1 : 1));
		return page(rows, listParams(request, 100));
	}),

	http.post("/api/dial/channels/:channelId/messages", async ({ request, params }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const body = await jsonBody<{ content: string }>(request);
		if (!body.content?.trim()) return validationError("Message content is required");
		const channel = db.channels.find((c) => c.id === params.channelId);
		if (!channel) return notFound("Channel");
		const message = {
			id: nextId("msg"),
			channel_id: channel.id,
			author_id: actor,
			version: 1,
			content: body.content.trim(),
			sent_at: new Date().toISOString(),
			thread_id: null as string | null,
			edited_at: null,
			deleted_at: null,
		};
		db.messages.push(message);
		channel.updated_at = message.sent_at;
		audit(actor, "message.send", "dial", "message", message.id);
		return created(message);
	}),

	http.put("/api/dial/messages/:messageId", async ({ request, params }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const message = db.messages.find((m) => m.id === params.messageId);
		if (!message) return notFound("Message");
		const conflictResp = checkVersion(request, message.version);
		if (conflictResp) return conflictResp;
		const body = await jsonBody<{ content: string }>(request);
		if (!body.content?.trim()) return validationError("Message content is required");
		message.content = body.content.trim();
		message.edited_at = new Date().toISOString();
		const v = bump(message);
		return ok({ ...message, version: v });
	}),

	http.delete("/api/dial/messages/:messageId", ({ request, params }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const message = db.messages.find((m) => m.id === params.messageId);
		if (!message) return notFound("Message");
		message.deleted_at = new Date().toISOString();
		bump(message);
		return noContent();
	}),

	http.post("/api/dial/messages/bulk-delete", async ({ request }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const { ids } = await jsonBody<{ ids: string[] }>(request);
		for (const id of ids ?? []) {
			const m = db.messages.find((x) => x.id === id);
			if (m) m.deleted_at = new Date().toISOString();
		}
		return noContent();
	}),

	http.get("/api/dial/search", ({ request }) => {
		if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
		const qs = (new URL(request.url).searchParams.get("q") ?? "").toLowerCase();
		const rows = db.messages
			.filter((m) => !m.deleted_at && m.content.toLowerCase().includes(qs))
			.slice(0, 25);
		return ok({ messages: rows });
	}),

	// --------------------------------------------------------------- threads
	http.post("/api/dial/threads", async ({ request }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const body = await jsonBody<{ channel_id: string; parent_message_id: string }>(request);
		if (!body.channel_id || !body.parent_message_id) {
			return validationError("channel_id and parent_message_id are required");
		}
		const thread = {
			id: nextId("thr"),
			channel_id: body.channel_id,
			parent_message_id: body.parent_message_id,
			created_at: new Date().toISOString(),
		};
		db.threads.push(thread);
		return created(thread);
	}),

	http.get("/api/dial/threads/:id", ({ request, params }) => {
		if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
		const thread = db.threads.find((t) => t.id === params.id);
		return thread ? ok(thread) : notFound("Thread");
	}),

	http.get("/api/dial/threads/:threadId/messages", ({ request, params }) => {
		if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
		return bare(db.messages.filter((m) => m.thread_id === params.threadId && !m.deleted_at));
	}),

	// -------------------------------------------------------------- mentions
	http.post("/api/dial/mentions", async ({ request }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const body = await jsonBody<{ message_id: string; user_id: string }>(request);
		const mention = {
			id: nextId("mnt"),
			message_id: body.message_id,
			user_id: body.user_id,
			read_at: null,
		};
		db.mentions.push(mention);
		return created(mention);
	}),

	http.get("/api/dial/mentions", ({ request }) => {
		if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
		return ok({ mentions: db.mentions.filter((m) => !m.read_at) });
	}),

	http.post("/api/dial/mentions/:mentionId/read", ({ params }) => {
		const mention = db.mentions.find((m) => m.id === params.mentionId);
		if (mention) mention.read_at = new Date().toISOString();
		return noContent();
	}),

	// ------------------------------------------------------------- reactions
	http.post("/api/dial/messages/:messageId/reactions", async ({ request, params }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const body = await jsonBody<{ emoji: string }>(request);
		if (!body.emoji) return validationError("emoji is required");
		const reaction = {
			id: nextId("rct"),
			message_id: params.messageId as string,
			user_id: actor,
			emoji: body.emoji,
			created_at: new Date().toISOString(),
		};
		db.reactions.push(reaction);
		return created(reaction);
	}),

	http.get("/api/dial/messages/:messageId/reactions", ({ request, params }) => {
		if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
		return bare(db.reactions.filter((r) => r.message_id === params.messageId));
	}),

	http.delete("/api/dial/messages/:messageId/reactions/:reactionId", ({ params }) => {
		const idx = db.reactions.findIndex((r) => r.id === params.reactionId);
		if (idx !== -1) db.reactions.splice(idx, 1);
		return noContent();
	}),

	// ------------------------------------------------------------------ files
	http.post("/api/dial/channels/:channelId/files", async ({ request }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const body = await jsonBody<{ filename: string }>(request);
		if (!body.filename) return validationError("filename is required");
		const fileId = nextId("file");
		return created({
			file_id: fileId,
			// In the mock the "presigned upload" accepts a PUT back to the worker.
			upload_url: `/api/dial/files/${fileId}`,
			key: `uploads/${fileId}/${body.filename}`,
			filename: body.filename,
		});
	}),

	http.put("/api/dial/files/:fileId", () => noContent()),

	// -------------------------------------------------------------- presence
	http.get("/api/dial/presence/online", ({ request }) => {
		if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
		// Demo presence: the admin is always online, others "most of the time".
		const online = db.users
			.filter((u) => u.is_active && (u.id === ADMIN_ID || u.id !== "usr-008"))
			.map((u) => u.id);
		return ok({ online_users: online });
	}),

	// ---------------------------------------------------------------- export
	http.get("/api/dial/channels/:channelId/export", ({ request, params }) => {
		if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
		const rows = db.messages.filter((m) => m.channel_id === params.channelId && !m.deleted_at);
		const csv = [
			"sent_at,author_id,content",
			...rows.map((m) => `${m.sent_at},${m.author_id},"${m.content.replaceAll('"', '""')}"`),
		].join("\n");
		return new HttpResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8" } });
	}),

	http.get("/api/dial/channels/:channelId/export/pdf", ({ request }) => {
		if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
		// Minimal but valid PDF: one page stating an export happened.
		const pdf = "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj\nxref\n0 4\n0000000000 65535 f \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n9\n%%EOF";
		return new HttpResponse(pdf, { headers: { "Content-Type": "application/pdf" } });
	}),

	// --------------------------------------------------------------- tickets
	http.get("/api/dial/tickets", ({ request }) => {
		if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
		const rows = [...db.tickets].sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
		return page(rows, listParams(request, 50));
	}),

	http.post("/api/dial/tickets", async ({ request }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const body = await jsonBody<{ subject: string; requester_name?: string; requester_email?: string; priority?: string }>(request);
		if (!body.subject?.trim()) return validationError("Subject is required");
		const now = new Date().toISOString();
		const ticket = {
			id: nextId("tkt"),
			subject: body.subject.trim(),
			status: "open" as const,
			priority: (body.priority as "low" | "medium" | "high" | "urgent") ?? "medium",
			requester_name: body.requester_name ?? "Unknown",
			requester_email: body.requester_email ?? "unknown@example.com",
			assignee_id: null,
			last_message: null,
			last_message_at: now,
			created_at: now,
			updated_at: now,
		};
		db.tickets.push(ticket);
		audit(actor, "ticket.create", "dial", "ticket", ticket.id);
		return created(ticket);
	}),

	http.get("/api/dial/tickets/:id", ({ request, params }) => {
		if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
		const ticket = db.tickets.find((t) => t.id === (params as Record<string, string>).id);
		return ticket ? ok(ticket) : notFound("Ticket");
	}),

	// Backend registers PUT (dial.rs:840) — the client PATCH bug is fixed in
	// apps/ataqu/src/apps/dial/api/tickets.ts; both verbs are accepted here so
	// a stale client build keeps working.
	http.put("/api/dial/tickets/:id", updateTicketHandler),
	http.patch("/api/dial/tickets/:id", updateTicketHandler),

	http.post("/api/dial/tickets/:id/replies", async ({ request, params }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const ticket = db.tickets.find((t) => t.id === params.id);
		if (!ticket) return notFound("Ticket");
		const body = await jsonBody<{ content: string }>(request);
		if (!body.content?.trim()) return validationError("Reply content is required");
		const message = {
			id: nextId("tmsg"),
			ticket_id: ticket.id,
			from_customer: false,
			content: body.content.trim(),
			created_at: new Date().toISOString(),
		};
		db.ticketMessages.push(message);
		ticket.last_message = message.content.slice(0, 80);
		ticket.last_message_at = message.created_at;
		ticket.updated_at = message.created_at;
		return created(message);
	}),

	http.get("/api/dial/tickets/:id/messages", ({ request, params }) => {
		if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
		return bare(
			db.ticketMessages
				.filter((m) => m.ticket_id === params.id)
				.sort((a, b) => (a.created_at < b.created_at ? -1 : 1)),
		);
	}),

	// ---------------------------------------------------------- cinq-context
	http.get("/api/dial/channels/:channelId/cinq-context", ({ request, params }) => {
		if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
		const channel = db.channels.find((c) => c.id === params.channelId);
		if (!channel) return ok(null);
		// Deterministic demo mapping: sales war-room ↔ the biggest open deal.
		if (channel.name === "sales-war-room") {
			const deal = [...db.deals].sort((a, b) => b.amount - a.amount).find((d) => d.status === "open");
			if (!deal) return ok(null);
			const contact = db.contacts.find((c) => c.id === deal.contact_id);
			return ok({
				deal_id: deal.id,
				name: deal.title,
				amount: deal.amount,
				stage: db.stages.find((s) => s.id === deal.pipeline_stage_id)?.name ?? "",
				contact_name: contact?.name ?? "",
				contact_email: contact?.email ?? "",
			});
		}
		return ok(null);
	}),
];

async function updateTicketHandler({ request, params }: { request: Request; params: PathParams }) {
	const actor = callerId(request);
	if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
	const ticket = db.tickets.find((t) => t.id === params.id);
	if (!ticket) return notFound("Ticket");
	const body = await jsonBody<{
		status?: typeof ticket.status;
		priority?: typeof ticket.priority;
		subject?: string;
		assignee_id?: string | null;
	}>(request);
	if (body.status != null) ticket.status = body.status;
	if (body.priority != null) ticket.priority = body.priority;
	if (body.subject != null) ticket.subject = body.subject;
	if (body.assignee_id !== undefined) ticket.assignee_id = body.assignee_id ?? null;
	ticket.updated_at = new Date().toISOString();
	audit(actor, "ticket.update", "dial", "ticket", ticket.id, body);
	return ok(ticket);
}

// Paginated helper re-export (kept for parity with the other handler modules)
export { paginated };
