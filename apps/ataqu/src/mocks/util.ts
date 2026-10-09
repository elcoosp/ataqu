/**
 * Mock-layer utilities (dev/demo only — never bundled in production builds).
 *
 * These helpers reproduce the exact wire contract of the Rust backend
 * (crates/ataqu-api):
 *
 *   - Success bodies are raw domain JSON (no {data, meta} wrapper).
 *   - Lists are either `PaginatedResponse<T>` ({items,total,limit,offset}) or
 *     bare arrays, exactly matching what `packages/api-client` declares.
 *   - Errors use the envelope `{error: {code, message, details}}`.
 *   - Creates return 201 with an `ETag: "<version>"` header, deletes return
 *     204, optimistic concurrency is enforced through `If-Match` (both the
 *     unquoted `3` and the quoted `"3"` forms must be accepted).
 *   - Mutations carry an `Idempotency-Key` header which is echoed back.
 */
import { HttpResponse, type JsonBodyType } from "msw";

// ---------------------------------------------------------------------------
// Errors — mirror of crates/ataqu-api/src/error.rs
// ---------------------------------------------------------------------------

export type ApiErrorCode =
	| "VALIDATION_ERROR"
	| "UNAUTHORIZED"
	| "FORBIDDEN"
	| "NOT_FOUND"
	| "CONFLICT"
	| "RATE_LIMITED"
	| "INTERNAL_ERROR";

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
	VALIDATION_ERROR: 422,
	UNAUTHORIZED: 401,
	FORBIDDEN: 403,
	NOT_FOUND: 404,
	CONFLICT: 409,
	RATE_LIMITED: 429,
	INTERNAL_ERROR: 500,
};

/** `{error:{code,message,details}}` — the exact envelope the Rust API emits. */
export const errorBody = (
	code: ApiErrorCode,
	message: string,
	details?: unknown,
) => ({
	error: { code, message, details: details ?? null },
});

export const apiError = (code: ApiErrorCode, message: string, details?: unknown) =>
	HttpResponse.json(errorBody(code, message, details), {
		status: STATUS_BY_CODE[code],
	});

export const notFound = (what = "Resource") =>
	apiError("NOT_FOUND", `${what} not found`);

export const validationError = (message: string, details?: unknown) =>
	apiError("VALIDATION_ERROR", message, details);

/**
 * Optimistic-concurrency conflict. The client's `ConflictError` reads
 * `payload.version` so the conflict dialog can offer "reload latest".
 */
export const conflict = (message: string, serverVersion: number) =>
	HttpResponse.json(
		{ code: "CONFLICT", message, version: serverVersion },
		{ status: 409 },
	);

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

/**
 * Mock bearer tokens are stateless: `mock.<userId>.<random>`. Parsing the
 * userId out of the token survives page reloads without a server-side session
 * store (the browser worker restarts on every reload).
 */
export const userIdFromToken = (token: string | null): string | null => {
	if (!token) return null;
	const parts = token.split(".");
	if (parts.length < 2 || parts[0] !== "mock") return null;
	return parts[1];
};

export const mintTokens = (userId: string) => ({
	access_token: `mock.${userId}.${crypto.randomUUID()}`,
	refresh_token: `mockr.${userId}.${crypto.randomUUID()}`,
});

/** Extract the caller's userId or `null` when the request is anonymous. */
export const callerId = (request: Request): string | null =>
	userIdFromToken(
		request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? null,
	);

// ---------------------------------------------------------------------------
// If-Match / ETag (optimistic concurrency)
// ---------------------------------------------------------------------------

/** `If-Match: 3` and `If-Match: "3"` must both parse (callers disagree). */
export const parseIfMatch = (request: Request): number | null => {
	const raw = request.headers.get("If-Match");
	if (!raw) return null;
	const n = Number(raw.replace(/"/g, ""));
	return Number.isFinite(n) ? n : null;
};

/**
 * Returns a 409 response when the client's If-Match is stale, otherwise null.
 * Missing If-Match is tolerated (the etag_middleware would return 428, but
 * several SPA flows legitimately omit it).
 */
export const checkVersion = (
	request: Request,
	serverVersion: number,
): HttpResponse<JsonBodyType> | null => {
	const client = parseIfMatch(request);
	if (client === null) return null;
	if (client !== serverVersion) {
		return conflict(
			"Version conflict: the record was modified by someone else.",
			serverVersion,
		);
	}
	return null;
};

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export interface ListParams {
	limit: number;
	offset: number;
}

export const listParams = (request: Request, defaultLimit = 50): ListParams => {
	const url = new URL(request.url);
	const limit = Number(url.searchParams.get("limit") ?? defaultLimit);
	const offset = Number(url.searchParams.get("offset") ?? 0);
	return {
		limit: Number.isFinite(limit) && limit > 0 ? limit : defaultLimit,
		offset: Number.isFinite(offset) && offset >= 0 ? offset : 0,
	};
};

/** `PaginatedResponse<T>` — `{items,total,limit,offset}`. */
export const paginated = <T>(items: T[], params: ListParams) => ({
	items: items.slice(params.offset, params.offset + params.limit),
	total: items.length,
	limit: params.limit,
	offset: params.offset,
});

export const page = <T>(items: T[], params: ListParams) =>
	HttpResponse.json(paginated(items, params));

/** Bare-array list response (pivot, searches, tasks, movements, …). */
export const bare = <T>(items: T[]) => HttpResponse.json(items);

// ---------------------------------------------------------------------------
// Bodies / misc
// ---------------------------------------------------------------------------

export const jsonBody = async <T>(request: Request): Promise<T> => {
	try {
		return (await request.json()) as T;
	} catch {
		return {} as T;
	}
};

/** 201 Created with the canonical `ETag: "<version>"` header. */
export const created = (body: Record<string, unknown>) => {
	const version = (body as { version?: number }).version;
	return HttpResponse.json(body, {
		status: 201,
		headers:
			version !== undefined
				? { ETag: `"${version}"`, "x-request-id": crypto.randomUUID() }
				: { "x-request-id": crypto.randomUUID() },
	});
};

export const ok = <T>(body: T) =>
	HttpResponse.json(body as Record<string, unknown>);

export const noContent = () =>
	new HttpResponse(null, {
		status: 204,
		headers: { "x-request-id": crypto.randomUUID() },
	});

// ---------------------------------------------------------------------------
// Small helpers shared by handlers (kept dependency-free on purpose)
// ---------------------------------------------------------------------------

export const q = (request: Request, name: string): string | null =>
	new URL(request.url).searchParams.get(name);

export const qInt = (request: Request, name: string, fallback: number): number => {
	const raw = q(request, name);
	const n = raw === null ? NaN : Number(raw);
	return Number.isFinite(n) ? n : fallback;
};

/** Case-insensitive substring match used by every mock search endpoint. */
export const matches = (haystack: string | null | undefined, needle: string) =>
	Boolean(haystack) && haystack!.toLowerCase().includes(needle.toLowerCase());

export const nowIso = () => new Date().toISOString();
