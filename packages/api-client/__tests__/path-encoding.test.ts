import { beforeEach, describe, expect, it, vi } from "vitest";
import { api, encodeApiPath, encodePathSegment } from "../src/client";

function jsonResponse(body: unknown) {
	return {
		ok: true,
		status: 200,
		json: async () => body,
		text: async () => JSON.stringify(body),
		blob: async () => new Blob(),
		arrayBuffer: async () => new ArrayBuffer(0),
	} as Response;
}

const fetchMock = vi.fn();

beforeEach(() => {
	fetchMock.mockReset();
	vi.stubGlobal("fetch", fetchMock as any);
});

describe("encodePathSegment", () => {
	it("leaves plain ids (uuids, slugs) untouched", () => {
		const uuid = "9f0c8e6a-1b2c-4d3e-8f4a-0b1c2d3e4f5a";
		expect(encodePathSegment(uuid)).toBe(uuid);
		expect(encodePathSegment("my-slug_1.2~x")).toBe("my-slug_1.2~x");
	});

	it("encodes path/query/fragment metacharacters", () => {
		expect(encodePathSegment("a/b")).toBe("a%2Fb");
		expect(encodePathSegment("..%2F..%2Fetc")).toBe("..%2F..%2Fetc");
		expect(encodePathSegment("a?b=c#d")).toBe("a%3Fb%3Dc%23d");
		expect(encodePathSegment("javascript:alert(1)")).toBe(
			"javascript%3Aalert(1)",
		);
	});

	it("encodes spaces and non-ascii characters", () => {
		expect(encodePathSegment("a b")).toBe("a%20b");
		expect(encodePathSegment("café")).toBe("caf%C3%A9");
	});

	it("is idempotent for already-encoded segments", () => {
		expect(encodePathSegment("a%20b")).toBe("a%20b");
		expect(encodePathSegment("%2F")).toBe("%2F");
	});

	it("escapes malformed escapes instead of throwing", () => {
		expect(encodePathSegment("100%")).toBe("100%25");
		expect(encodePathSegment("%zz")).toBe("%25zz");
	});
});

describe("encodeApiPath", () => {
	it("encodes each segment and preserves structure", () => {
		expect(encodeApiPath("/cinq/contacts/abc def")).toBe(
			"/cinq/contacts/abc%20def",
		);
		expect(encodeApiPath("/a//b/")).toBe("/a//b/");
	});

	it("keeps encoded slashes inside their segment", () => {
		expect(encodeApiPath("/pivot/doc/a%2Fb")).toBe("/pivot/doc/a%2Fb");
	});

	it("leaves the query string untouched", () => {
		expect(encodeApiPath("/v1/onboarding/status?tenant_id=t-1")).toBe(
			"/v1/onboarding/status?tenant_id=t-1",
		);
	});

	it("blocks `..` segment traversal payloads by encoding the dots", () => {
		expect(encodeApiPath(`/vault/products/${"../../admin"}`)).toBe(
			"/vault/products/%2E%2E/%2E%2E/admin",
		);
		expect(encodeApiPath("/x/./y")).toBe("/x/%2E/y");
	});
});

describe("request path encoding end-to-end", () => {
	it("sends an encoded URL to fetch", async () => {
		fetchMock.mockResolvedValue(jsonResponse({ id: "x" }));
		await api.get("/cinq/contacts/a b?keep=1");
		const [url] = fetchMock.mock.calls[0];
		expect(url).toBe("/api/cinq/contacts/a%20b?keep=1");
	});
});
