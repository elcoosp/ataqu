import { useAuthStore } from "@ataqu/shared-stores";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../src/client";

function jsonResponse(
	body: unknown,
	init: { ok?: boolean; status?: number } = {},
) {
	return {
		ok: init.ok ?? true,
		status: init.status ?? 200,
		json: async () => body,
		text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
		blob: async () => new Blob(),
		arrayBuffer: async () => new ArrayBuffer(0),
	} as Response;
}

const fetchMock = vi.fn();

beforeEach(() => {
	fetchMock.mockReset();
	vi.stubGlobal("fetch", fetchMock as any);
	useAuthStore.setState({ token: null, user: null, tenantId: null });
});

describe("api client request core", () => {
	it("performs a GET without idempotency key", async () => {
		fetchMock.mockResolvedValue(jsonResponse([{ id: "1" }]));
		await api.get("/cinq/deals");
		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [, opts] = fetchMock.mock.calls[0];
		expect(opts.method).toBe("GET");
		expect(opts.headers.get("Idempotency-Key")).toBeNull();
	});

	it("sends Authorization when a token is present", async () => {
		useAuthStore.setState({ token: "abc" });
		fetchMock.mockResolvedValue(jsonResponse({}));
		await api.get("/x");
		const [, opts] = fetchMock.mock.calls[0];
		expect(opts.headers.get("Authorization")).toBe("Bearer abc");
	});

	it("adds an idempotency key for POST/PUT/PATCH/DELETE", async () => {
		fetchMock.mockResolvedValue(jsonResponse({}));
		await api.post("/x", { a: 1 });
		const [, postOpts] = fetchMock.mock.calls[0];
		expect(postOpts.headers.get("Idempotency-Key")).toMatch(/^[0-9a-f-]{36}$/);
	});

	it("serializes JSON body and sets content-type", async () => {
		fetchMock.mockResolvedValue(jsonResponse({}));
		await api.post("/x", { a: 1 });
		const [, opts] = fetchMock.mock.calls[0];
		expect(opts.body).toBe(JSON.stringify({ a: 1 }));
		expect(opts.headers.get("Content-Type")).toBe("application/json");
	});

	it("passes FormData through untouched", async () => {
		fetchMock.mockResolvedValue(jsonResponse({}));
		const fd = new FormData();
		fd.append("f", "v");
		await api.post("/upload", fd);
		const [, opts] = fetchMock.mock.calls[0];
		expect(opts.body).toBe(fd);
	});

	it("appends query params from options.params", async () => {
		fetchMock.mockResolvedValue(jsonResponse([]));
		await api.get("/cinq/deals", { params: { limit: 10, offset: 0 } });
		const [url] = fetchMock.mock.calls[0];
		expect(url).toContain("?limit=10&offset=0");
	});

	it("omits undefined params", async () => {
		fetchMock.mockResolvedValue(jsonResponse([]));
		await api.get("/x", { params: { a: 1, b: undefined, c: null } });
		const [url] = fetchMock.mock.calls[0];
		expect(url).toBe("/api/x?a=1");
	});

	it("uses the /api base by default", async () => {
		fetchMock.mockResolvedValue(jsonResponse({}));
		await api.get("/x");
		const [url] = fetchMock.mock.calls[0];
		expect(url.startsWith("/api")).toBe(true);
	});

	it("returns text when responseType is text", async () => {
		fetchMock.mockResolvedValue(jsonResponse("hi"));
		const r = await api.get<string>("/x", { responseType: "text" });
		expect(r).toBe("hi");
	});

	it("throws an ApiError on non-ok responses with parsed error body", async () => {
		fetchMock.mockResolvedValue(
			jsonResponse({ message: "nope" }, { ok: false, status: 409 }),
		);
		await expect(api.get("/x")).rejects.toMatchObject({
			name: "ApiError",
			status: 409,
			message: "nope",
		});
	});

	it("returns undefined for 204 No Content instead of throwing", async () => {
		fetchMock.mockResolvedValue(
			jsonResponse(undefined, { ok: true, status: 204 }),
		);
		const result = await api.delete("/x");
		expect(result).toBeUndefined();
	});

	it("returns undefined for an empty 200 body", async () => {
		fetchMock.mockResolvedValue(
			jsonResponse(undefined, { ok: true, status: 200 }),
		);
		const result = await api.delete("/x");
		expect(result).toBeUndefined();
	});
});

describe("If-Match optimistic concurrency headers", () => {
	beforeEach(() => {
		fetchMock.mockResolvedValue(jsonResponse({ id: "1", version: 2 }));
	});

	it("updateDeal sends If-Match: <version> (unquoted)", async () => {
		const { updateDeal } = await import("../src/cinq");
		await updateDeal("d1", { title: "x" }, 5);
		const [, opts] = fetchMock.mock.calls[0];
		expect(opts.method).toBe("PUT");
		expect(opts.headers.get("If-Match")).toBe("5");
	});

	it("cancelBooking sends If-Match quoted (tempo POST)", async () => {
		const { cancelBooking } = await import("../src/tempo");
		await cancelBooking("b1", 3);
		const [, opts] = fetchMock.mock.calls[0];
		expect(opts.method).toBe("POST");
		expect(opts.headers.get("If-Match")).toBe('"3"');
	});

	it("rescheduleBooking sends If-Match quoted", async () => {
		const { rescheduleBooking } = await import("../src/tempo");
		await rescheduleBooking("b1", { starts_at: "2026-01-01T00:00:00Z" }, 7);
		const [, opts] = fetchMock.mock.calls[0];
		expect(opts.headers.get("If-Match")).toBe('"7"');
	});

	it("updateBlock sends If-Match unquoted", async () => {
		const { updateBlock } = await import("../src/pivot");
		await updateBlock("bl1", { content: { text: "x" } }, 2);
		const [, opts] = fetchMock.mock.calls[0];
		expect(opts.headers.get("If-Match")).toBe("2");
	});

	it("updateProduct sends If-Match unquoted", async () => {
		const { updateProduct } = await import("../src/vault");
		await updateProduct("p1", { name: "n" }, 9);
		const [, opts] = fetchMock.mock.calls[0];
		expect(opts.headers.get("If-Match")).toBe("9");
	});

	it("updateUserRole sends If-Match unquoted", async () => {
		const { updateUserRole } = await import("../src/aegis");
		await updateUserRole("u1", { role: "admin" }, 4);
		const [, opts] = fetchMock.mock.calls[0];
		expect(opts.headers.get("If-Match")).toBe("4");
	});

	it("updateForm sends If-Match unquoted", async () => {
		const { updateForm } = await import("../src/sond");
		await updateForm("f1", { title: "t" }, 1);
		const [, opts] = fetchMock.mock.calls[0];
		expect(opts.headers.get("If-Match")).toBe("1");
	});

	it("updateDashboard sends If-Match unquoted", async () => {
		const { updateDashboard } = await import("../src/vista");
		await updateDashboard("vd1", { config: {} }, 6);
		const [, opts] = fetchMock.mock.calls[0];
		expect(opts.headers.get("If-Match")).toBe("6");
	});

	it("reserveStock sends If-Match unquoted", async () => {
		const { reserveStock } = await import("../src/vault");
		await reserveStock("v1", { quantity: 2 }, 8);
		const [, opts] = fetchMock.mock.calls[0];
		expect(opts.headers.get("If-Match")).toBe("8");
	});
});
