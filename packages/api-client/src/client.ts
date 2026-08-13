import { useAuthStore } from "@ataqu/shared-stores";
import { generateIdempotencyKey } from "@ataqu/shared-utils";

export interface RequestOptions extends RequestInit {
	params?: Record<string, any>;
	responseType?: "json" | "blob" | "text" | "arraybuffer";
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

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
		const error = await resp
			.json()
			.catch(() => ({ code: resp.status, message: resp.statusText }));
		throw error;
	}

	const responseType = options.responseType || "json";
	if (responseType === "blob") return resp.blob() as any;
	if (responseType === "text") return resp.text() as any;
	if (responseType === "arraybuffer") return resp.arrayBuffer() as any;
	return resp.json() as Promise<T>;
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
