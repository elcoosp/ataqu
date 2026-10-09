/**
 * TEMPO (scheduling) handlers — event types, availability slots, bookings
 * (incl. the public booking funnel). Booking ops require quoted If-Match from
 * the client; both forms are accepted. Mirrors handlers/tempo.rs.
 */
import { http, type HttpHandler } from "msw";
import { TENANT_ID, audit, bump, db, nextId } from "../db";
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

const tempoEnvelope = <T>(rows: T[], params: { limit: number; offset: number }) => ({
	items: rows.slice(params.offset, params.offset + params.limit),
	total: rows.length,
	limit: params.limit,
	offset: params.offset,
});

export const tempoHandlers: HttpHandler[] = [
	// ----------------------------------------------------------- event types
	http.get("/api/tempo/event-types", ({ request }) => {
		if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
		return ok(tempoEnvelope(db.eventTypes, listParams(request, 50)));
	}),

	http.post("/api/tempo/event-types", async ({ request }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const body = await jsonBody<{
			name: string;
			slug: string;
			description?: string;
			duration_minutes: number;
		}>(request);
		if (!body.name?.trim()) return validationError("Name is required");
		const slug = body.slug?.trim() || body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
		if (db.eventTypes.some((e) => e.slug === slug)) {
			return apiError("CONFLICT", "An event type with this slug already exists");
		}
		const now = new Date().toISOString();
		const eventType = {
			id: nextId("evt"),
			tenant_id: TENANT_ID,
			name: body.name.trim(),
			slug,
			description: body.description,
			duration_minutes: body.duration_minutes ?? 30,
			is_active: true,
			created_at: now,
			updated_at: now,
			version: 1,
		};
		db.eventTypes.push(eventType);
		audit(actor, "event_type.create", "tempo", "event_type", eventType.id, { name: eventType.name });
		return created(eventType);
	}),

	http.get("/api/tempo/event-types/:id", ({ request, params }) => {
		if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
		const eventType = db.eventTypes.find((e) => e.id === params.id);
		return eventType ? ok(eventType) : notFound("Event type");
	}),

	http.put("/api/tempo/event-types/:id", async ({ request, params }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const eventType = db.eventTypes.find((e) => e.id === params.id);
		if (!eventType) return notFound("Event type");
		const conflictResp = checkVersion(request, eventType.version);
		if (conflictResp) return conflictResp;
		const body = await jsonBody<Record<string, unknown>>(request);
		if (body.name != null) eventType.name = body.name as string;
		if (body.slug != null) eventType.slug = body.slug as string;
		if (body.description !== undefined) eventType.description = (body.description as string) ?? undefined;
		if (body.duration_minutes != null) eventType.duration_minutes = body.duration_minutes as number;
		if (body.is_active != null) eventType.is_active = body.is_active as boolean;
		eventType.updated_at = new Date().toISOString();
		const v = bump(eventType);
		audit(actor, "event_type.update", "tempo", "event_type", eventType.id, body);
		return ok({ ...eventType, version: v });
	}),

	http.delete("/api/tempo/event-types/:id", ({ request, params }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const idx = db.eventTypes.findIndex((e) => e.id === params.id);
		if (idx === -1) return notFound("Event type");
		db.eventTypes.splice(idx, 1);
		audit(actor, "event_type.delete", "tempo", "event_type", params.id as string);
		return noContent();
	}),

	// Public slug resolution (no auth) — used by /book/:slug
	http.get("/api/tempo/public/event-types/:slug", ({ params }) => {
		const eventType = db.eventTypes.find((e) => e.slug === params.slug && e.is_active);
		return eventType ? ok(eventType) : notFound("Event type");
	}),

	// ------------------------------------------------------------- availability
	http.get("/api/tempo/availability-slots/:eventTypeId", ({ request, params }) => {
		if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
		return bare(
			db.slots
				.filter((s) => s.event_type_id === params.eventTypeId)
				.sort((a, b) => (a.start_time < b.start_time ? -1 : 1)),
		);
	}),

	http.post("/api/tempo/availability-slots", async ({ request }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const body = await jsonBody<{ event_type_id: string; start_time: string; end_time: string }>(request);
		if (!body.event_type_id || !body.start_time || !body.end_time) {
			return validationError("event_type_id, start_time and end_time are required");
		}
		const slot = {
			id: nextId("slt"),
			event_type_id: body.event_type_id,
			start_time: body.start_time,
			end_time: body.end_time,
			is_booked: false,
		};
		db.slots.push(slot);
		return created(slot);
	}),

	http.delete("/api/tempo/availability-slots/:id", ({ request, params }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const idx = db.slots.findIndex((s) => s.id === params.id);
		if (idx === -1) return notFound("Slot");
		db.slots.splice(idx, 1);
		return noContent();
	}),

	// ---------------------------------------------------------------- bookings
	http.get("/api/tempo/bookings", ({ request }) => {
		if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
		const rows = [...db.bookings].sort((a, b) => (a.starts_at < b.starts_at ? 1 : -1));
		return ok(tempoEnvelope(rows, listParams(request, 50)));
	}),

	http.post("/api/tempo/bookings", async ({ request }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const body = await jsonBody<{
			event_type_id: string;
			starts_at: string;
			duration_minutes?: number;
			timezone?: string;
		}>(request);
		if (!body.event_type_id || !body.starts_at) {
			return validationError("event_type_id and starts_at are required");
		}
		const eventType = db.eventTypes.find((e) => e.id === body.event_type_id);
		const now = new Date().toISOString();
		const booking = {
			id: nextId("bkg"),
			event_type_id: body.event_type_id,
			starts_at: body.starts_at,
			duration_minutes: body.duration_minutes ?? eventType?.duration_minutes ?? 30,
			timezone: body.timezone ?? "UTC",
			status: "pending" as const,
			created_at: now,
			updated_at: now,
			version: 1,
		};
		db.bookings.push(booking);
		audit(actor, "booking.create", "tempo", "booking", booking.id);
		return created(booking);
	}),

	http.post("/api/tempo/bookings/bulk-cancel", async ({ request }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const { ids } = await jsonBody<{ ids: string[] }>(request);
		for (const id of ids ?? []) {
			const booking = db.bookings.find((b) => b.id === id);
			if (booking && booking.status !== "cancelled") {
				booking.status = "cancelled";
				bump(booking);
			}
		}
		return noContent();
	}),

	// Public booking funnel (no auth) — POST /tempo/public/:tenantId/bookings
	http.post("/api/tempo/public/:tenantId/bookings", async ({ request, params }) => {
		const body = await jsonBody<{
			slug: string;
			starts_at: string;
			timezone?: string;
			invitee_name: string;
			invitee_email: string;
		}>(request);
		if (!body.slug || !body.starts_at || !body.invitee_name) {
			return validationError("slug, starts_at and invitee_name are required");
		}
		const eventType = db.eventTypes.find((e) => e.slug === body.slug);
		if (!eventType) return notFound("Event type");
		const slot = db.slots.find((s) => s.start_time === body.starts_at);
		if (slot) slot.is_booked = true;
		const now = new Date().toISOString();
		const booking = {
			id: nextId("bkg"),
			event_type_id: eventType.id,
			starts_at: body.starts_at,
			duration_minutes: eventType.duration_minutes,
			timezone: body.timezone ?? "UTC",
			status: "confirmed" as const,
			created_at: now,
			updated_at: now,
			version: 1,
		};
		db.bookings.push(booking);
		return created(booking);
	}),

	http.get("/api/tempo/bookings/:id", ({ request, params }) => {
		if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
		const booking = db.bookings.find((b) => b.id === params.id);
		return booking ? ok(booking) : notFound("Booking");
	}),

	// Booking state transitions — client sends quoted If-Match; both accepted.
	http.post("/api/tempo/bookings/:id/cancel", ({ request, params }) => transitionBooking(request, params.id as string, "cancelled")),
	http.post("/api/tempo/bookings/:id/confirm", ({ request, params }) => transitionBooking(request, params.id as string, "confirmed")),
	http.post("/api/tempo/bookings/:id/no-show", ({ request, params }) => transitionBooking(request, params.id as string, "no_show")),
	http.post("/api/tempo/bookings/:id/joined", ({ request, params }) => {
		const booking = db.bookings.find((b) => b.id === params.id);
		if (!booking) return notFound("Booking");
		return noContent();
	}),

	http.post("/api/tempo/bookings/:id/reschedule", async ({ request, params }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const booking = db.bookings.find((b) => b.id === params.id);
		if (!booking) return notFound("Booking");
		const conflictResp = checkVersion(request, booking.version);
		if (conflictResp) return conflictResp;
		const body = await jsonBody<{ starts_at: string }>(request);
		if (!body.starts_at) return validationError("starts_at is required");
		booking.starts_at = body.starts_at;
		booking.updated_at = new Date().toISOString();
		const v = bump(booking);
		return ok({ ...booking, version: v });
	}),
];

function transitionBooking(request: Request, id: string, status: "cancelled" | "confirmed" | "no_show") {
	const actor = callerId(request);
	if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
	const booking = db.bookings.find((b) => b.id === id);
	if (!booking) return notFound("Booking");
	const conflictResp = checkVersion(request, booking.version);
	if (conflictResp) return conflictResp;
	booking.status = status;
	booking.updated_at = new Date().toISOString();
	if (status === "cancelled") {
		const slot = db.slots.find((s) => s.start_time === booking.starts_at);
		if (slot) slot.is_booked = false;
	}
	const v = bump(booking);
	return ok({ ...booking, version: v });
}
