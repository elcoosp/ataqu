import { useAuthStore } from "@ataqu/shared-stores";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	ApiError,
	api,
	ConflictError,
	RateLimitedError,
	ValidationError,
} from "../src/client";
import { getPublicForm, submitForm, updateForm } from "../src/sond";

function responseWith(
	body: unknown,
	{
		ok = true,
		status = 200,
		headers = {} as Record<string, string>,
	}: { ok?: boolean; status?: number; headers?: Record<string, string> } = {},
) {
	return {
		ok,
		status,
		headers: { get: (k: string) => headers[k.toLowerCase()] ?? null },
		json: async () => body,
		text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
		blob: async () => new Blob(),
		arrayBuffer: async () => new ArrayBuffer(0),
	} as unknown as Response;
}

const fetchMock = vi.fn();

beforeEach(() => {
	fetchMock.mockReset();
	vi.stubGlobal("fetch", fetchMock as any);
	useAuthStore.setState({ token: null, user: null, tenantId: null });
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe("client v2 typed errors", () => {
	it("maps 409 to ConflictError carrying the server version", async () => {
		fetchMock.mockResolvedValue(
			responseWith(
				{ code: "version_conflict", message: "stale", version: 9 },
				{ ok: false, status: 409 },
			),
		);
		const err = await api.get("/x").catch((e) => e);
		expect(err).toBeInstanceOf(ConflictError);
		expect(err).toBeInstanceOf(ApiError);
		expect(err.status).toBe(409);
		expect(err.serverVersion).toBe(9);
	});

	it("maps 412 to ConflictError as well", async () => {
		fetchMock.mockResolvedValue(
			responseWith({ version: 4 }, { ok: false, status: 412 }),
		);
		const err = await api.put("/x", {}).catch((e) => e);
		expect(err).toBeInstanceOf(ConflictError);
		expect(err.serverVersion).toBe(4);
	});

	it("maps 429 to RateLimitedError with Retry-After seconds", async () => {
		fetchMock.mockResolvedValue(
			responseWith(
				{ message: "slow down" },
				{ ok: false, status: 429, headers: { "retry-after": "12" } },
			),
		);
		const err = await api.get("/x").catch((e) => e);
		expect(err).toBeInstanceOf(RateLimitedError);
		expect(err.retryAfterMs).toBe(12_000);
	});

	it("maps 422 to ValidationError with server details", async () => {
		fetchMock.mockResolvedValue(
			responseWith(
				{ message: "invalid", details: { email: "bad" } },
				{ ok: false, status: 422 },
			),
		);
		const err = await api.post("/x", {}).catch((e) => e);
		expect(err).toBeInstanceOf(ValidationError);
		expect(err.details).toEqual({ email: "bad" });
	});
});

describe("client v2 retries", () => {
	it("retries once on 5xx reusing the same Idempotency-Key", async () => {
		fetchMock
			.mockResolvedValueOnce(
				responseWith({ message: "boom" }, { ok: false, status: 502 }),
			)
			.mockResolvedValueOnce(responseWith({ ok: true }));
		const p = api.post("/x", { a: 1 });
		await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
		const key1 = fetchMock.mock.calls[0][1].headers.get("Idempotency-Key");
		const key2 = fetchMock.mock.calls[1][1].headers.get("Idempotency-Key");
		expect(key1).toBeTruthy();
		expect(key2).toBe(key1);
		await p;
	});

	it("retries once on network failure then succeeds", async () => {
		fetchMock
			.mockRejectedValueOnce(new TypeError("network down"))
			.mockResolvedValueOnce(responseWith({ ok: true }));
		const result = await api.get("/x");
		expect(result).toEqual({ ok: true });
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it("does not retry client errors", async () => {
		fetchMock.mockResolvedValue(
			responseWith({ message: "nope" }, { ok: false, status: 404 }),
		);
		await expect(api.get("/x")).rejects.toBeInstanceOf(ApiError);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});
});

describe("client v2 abort + etag", () => {
	it("forwards AbortSignal to fetch", async () => {
		fetchMock.mockResolvedValue(responseWith({}));
		const controller = new AbortController();
		await api.get("/x", { signal: controller.signal });
		const [, opts] = fetchMock.mock.calls[0];
		expect(opts.signal).toBe(controller.signal);
	});

	it("caches GET etags and revalidates with If-None-Match", async () => {
		fetchMock
			.mockResolvedValueOnce(
				responseWith({ items: [1] }, { headers: { etag: '"v1"' } }),
			)
			.mockResolvedValueOnce(
				responseWith(undefined, { status: 304, headers: { etag: '"v1"' } }),
			);
		const first = await api.get<{ items: number[] }>("/cinq/deals");
		const second = await api.get<{ items: number[] }>("/cinq/deals");
		expect(first).toEqual({ items: [1] });
		expect(second).toEqual({ items: [1] });
		const [, secondOpts] = fetchMock.mock.calls[1];
		expect(secondOpts.headers.get("If-None-Match")).toBe('"v1"');
	});
});

describe("client v2 public (anonymous) calls", () => {
	it("omits Authorization when skipAuth is set, even with a session token", async () => {
		useAuthStore.setState({ token: "secret-token" });
		fetchMock.mockResolvedValue(responseWith({ title: "Public form" }));
		await api.get("/sond/public/forms/f1", { skipAuth: true });
		const [, opts] = fetchMock.mock.calls[0];
		expect(opts.headers.get("Authorization")).toBeNull();
	});

	it("still sends Authorization by default", async () => {
		useAuthStore.setState({ token: "secret-token" });
		fetchMock.mockResolvedValue(responseWith({}));
		await api.get("/cinq/deals");
		const [, opts] = fetchMock.mock.calls[0];
		expect(opts.headers.get("Authorization")).toBe("Bearer secret-token");
	});
});

describe("sond public funnel gating", () => {
	it("publishes a form through the update endpoint with a status transition", async () => {
		useAuthStore.setState({ token: "secret-token" });
		fetchMock.mockResolvedValue(
			responseWith({ id: "f1", status: "published", version: 1 }),
		);
		await updateForm("f1", { status: "published" }, 0);
		const [path, opts] = fetchMock.mock.calls[0];
		expect(path).toBe("/api/sond/forms/f1");
		expect(opts.method).toBe("PUT");
		expect(JSON.parse(opts.body).status).toBe("published");
		expect(opts.headers.get("If-Match")).toBe("0");
	});

	it("omits Authorization on public submit calls even with a session token", async () => {
		useAuthStore.setState({ token: "secret-token" });
		fetchMock.mockResolvedValue(responseWith({}, { status: 201 }));
		await submitForm("f1", { answers: [] });
		const [, opts] = fetchMock.mock.calls[0];
		expect(opts.headers.get("Authorization")).toBeNull();
	});

	it("fetches published forms from the unauthenticated public endpoint", async () => {
		useAuthStore.setState({ token: "secret-token" });
		fetchMock.mockResolvedValue(responseWith({ id: "f1" }));
		await getPublicForm("f1");
		const [path, opts] = fetchMock.mock.calls[0];
		expect(path).toBe("/api/sond/public/forms/f1");
		expect(opts.headers.get("Authorization")).toBeNull();
	});
});
