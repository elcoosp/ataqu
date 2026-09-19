import { useAuthStore } from "@ataqu/shared-stores";
import { generateIdempotencyKey } from "@ataqu/shared-utils";

export interface RequestOptions extends RequestInit {
	params?: Record<string, any>;
	responseType?: "json" | "blob" | "text" | "arraybuffer";
	/**
	 * Send the request without Authorization, even when a session token exists.
	 * Required for public/anonymous surfaces (public form, public booking) so
	 * no tenant credential ever leaks to a guest-facing page.
	 */
	skipAuth?: boolean;
}

/**
 * Normalized error for every non-2xx response. Carries the HTTP status and the
 * server's `code`/`message` fields when present, and always extends Error so
 * `error instanceof Error` holds and `error.message` is a usable string.
 */
export class ApiError extends Error {
	status: number;
	code?: string;
	details?: unknown;

	constructor(
		status: number,
		message: string,
		code?: string,
		details?: unknown,
	) {
		super(message);
		this.name = "ApiError";
		this.status = status;
		this.code = code;
		this.details = details;
	}
}

/** 409/412 — the stored record changed underneath the caller. */
export class ConflictError extends ApiError {
	/** The server's current version, when provided, for "reload & merge" UX. */
	serverVersion?: number;

	constructor(
		message: string,
		code?: string,
		details?: unknown,
		serverVersion?: number,
	) {
		super(409, message, code, details);
		this.name = "ApiError";
		this.serverVersion = serverVersion;
	}
}

/** 429 — rate limited; carries the server's Retry-After hint in ms. */
export class RateLimitedError extends ApiError {
	retryAfterMs?: number;

	constructor(
		message: string,
		code?: string,
		details?: unknown,
		retryAfterMs?: number,
	) {
		super(429, message, code, details);
		this.name = "ApiError";
		this.retryAfterMs = retryAfterMs;
	}
}

/** 422 — validation failure; carries the server's field details. */
export class ValidationError extends ApiError {
	constructor(
		message: string,
		code?: string,
		details?: unknown,
	) {
		super(422, message, code, details);
		this.name = "ApiError";
	}
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

async function parseError(resp: Response): Promise<ApiError> {
	let payload: {
		code?: string;
		message?: string;
		error?: string;
		version?: number;
		details?: unknown;
	} | null = null;
	try {
		payload = await resp.json();
	} catch {
		payload = null;
	}
	const message =
		payload?.message || payload?.error || resp.statusText || "Request failed";
	if (resp.status === 409 || resp.status === 412) {
		return new ConflictError(message, payload?.code, payload, payload?.version);
	}
	if (resp.status === 429) {
		const retryAfter = Number.parseFloat(
			resp.headers?.get("Retry-After") ?? "",
		);
		return new RateLimitedError(
			message,
			payload?.code,
			payload,
			Number.isFinite(retryAfter) ? retryAfter * 1000 : undefined,
		);
	}
	if (resp.status === 422) {
		return new ValidationError(
			message,
			payload?.code,
			payload?.details ?? payload,
		);
	}
	return new ApiError(resp.status, message, payload?.code, payload);
}

const RETRYABLE_STATUS = new Set([500, 502, 503, 504]);

/** In-memory ETag cache for 304 revalidation of cacheable GETs (client v2). */
const etagCache = new Map<string, { etag: string; body: unknown }>();

async function request<T>(
	path: string,
	options: RequestOptions = {},
): Promise<T> {
	const token = useAuthStore.getState().token;
	const headers = new Headers(options.headers);
	if (token && !options.skipAuth) headers.set("Authorization", `Bearer ${token}`);
	const isMutation = Boolean(
		options.method &&
			["POST", "PUT", "PATCH", "DELETE"].includes(options.method.toUpperCase()),
	);
	// One stable key per logical mutation: retries reuse it so the server's
	// idempotency middleware deduplicates instead of double-applying.
	const idempotencyKey = isMutation ? generateIdempotencyKey() : undefined;
	if (idempotencyKey) headers.set("Idempotency-Key", idempotencyKey);
	if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
		headers.set("Content-Type", "application/json");
	}

	let url = `${BASE_URL}${path}`;
	if (options.params) {
		const searchParams = new URLSearchParams();
		for (const [key, val] of Object.entries(options.params)) {
			if (val !== undefined && val !== null)
				searchParams.append(key, String(val));
		}
		const qs = searchParams.toString();
		if (qs) url += `?${qs}`;
	}

	// ETag revalidation for cacheable GETs (client v2).
	const method = (options.method ?? "GET").toUpperCase();
	const isGet = method === "GET";
	const cached = isGet ? etagCache.get(url) : undefined;
	if (cached) headers.set("If-None-Match", cached.etag);

	let body: BodyInit | undefined;
	if (options.body) {
		if (options.body instanceof FormData) {
			body = options.body;
		} else {
			body = JSON.stringify(options.body);
		}
	}

	const send = () =>
		fetch(url, {
			...options,
			method,
			headers,
			body,
		});

	let resp: Response;
	try {
		resp = await send();
	} catch (err) {
		// Network failure: retry once with the same idempotency key.
		if (options.signal?.aborted) throw err;
		resp = await send();
	}

	if (resp.status === 304 && cached) {
		return cached.body as T;
	}

	if (!resp.ok) {
		if (RETRYABLE_STATUS.has(resp.status)) {
			// One retry with backoff, reusing the idempotency key so the
			// server's idempotency middleware deduplicates the replay.
			await new Promise((r) => setTimeout(r, 300));
			resp = await send();
			if (!resp.ok) throw await parseError(resp);
		} else {
			throw await parseError(resp);
		}
	}

	// Store the ETag for future GET revalidation (headers absent in some
	// synthetic/mock responses — access defensively).
	const etag = resp.headers?.get("ETag") ?? null;

	// 204 No Content (and any response without a body) must not be parsed as
	// JSON — doing so throws a SyntaxError and masks a successful request.
	const responseType = options.responseType || "json";
	if (responseType !== "json") {
		if (responseType === "blob") return (await resp.blob()) as T;
		if (responseType === "text") return (await resp.text()) as T;
		if (responseType === "arraybuffer") return (await resp.arrayBuffer()) as T;
	}

	if (resp.status === 204) return undefined as T;
	const text = await resp.text();
	if (!text) return undefined as T;
	try {
		const parsed = JSON.parse(text) as T;
		if (isGet && etag && resp.status === 200) {
			etagCache.set(url, { etag, body: parsed });
		}
		return parsed;
	} catch {
		// Non-JSON 2xx body (e.g. plain text): surface the raw text.
		return text as unknown as T;
	}
}

export const api = {
	get: <T>(path: string, options?: RequestOptions): Promise<T> =>
		request<T>(path, { ...options, method: "GET" }),
	post: <T>(path: string, data?: any, options?: RequestOptions): Promise<T> =>
		request<T>(path, { ...options, method: "POST", body: data }),
	put: <T>(path: string, data?: any, options?: RequestOptions): Promise<T> =>
		request<T>(path, { ...options, method: "PUT", body: data }),
	patch: <T>(path: string, data?: any, options?: RequestOptions): Promise<T> =>
		request<T>(path, { ...options, method: "PATCH", body: data }),
	delete: <T>(path: string, options?: RequestOptions): Promise<T> =>
		request<T>(path, { ...options, method: "DELETE" }),
};
