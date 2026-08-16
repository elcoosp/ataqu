import { useAuthStore } from "@ataqu/shared-stores";
import { generateIdempotencyKey } from "@ataqu/shared-utils";

export interface RequestOptions extends RequestInit {
	params?: Record<string, any>;
	responseType?: "json" | "blob" | "text" | "arraybuffer";
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

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

async function parseError(resp: Response): Promise<ApiError> {
	let payload: { code?: string; message?: string; error?: string } | null =
		null;
	try {
		payload = await resp.json();
	} catch {
		payload = null;
	}
	const message =
		payload?.message || payload?.error || resp.statusText || "Request failed";
	return new ApiError(resp.status, message, payload?.code, payload);
}

async function request<T>(
	path: string,
	options: RequestOptions = {},
): Promise<T> {
	const token = useAuthStore.getState().token;
	const headers = new Headers(options.headers);
	if (token) headers.set("Authorization", `Bearer ${token}`);
	if (
		options.method &&
		["POST", "PUT", "PATCH", "DELETE"].includes(options.method.toUpperCase())
	) {
		headers.set("Idempotency-Key", generateIdempotencyKey());
	}
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

	let body: BodyInit | undefined;
	if (options.body) {
		if (options.body instanceof FormData) {
			body = options.body;
		} else {
			body = JSON.stringify(options.body);
		}
	}

	const resp = await fetch(url, {
		...options,
		headers,
		body,
	});

	if (!resp.ok) {
		throw await parseError(resp);
	}

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
		return JSON.parse(text) as T;
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
