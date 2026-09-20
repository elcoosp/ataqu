import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getInbox } from "../src/inbox";

const fetchMock = vi.fn();

beforeEach(() => {
	fetchMock.mockReset();
	vi.stubGlobal("fetch", fetchMock as any);
});

afterEach(() => vi.unstubAllGlobals());

describe("inbox client", () => {
	it("reads the cross-app inbox from the mounted v1 path with a limit", async () => {
		fetchMock.mockResolvedValue({
			ok: true,
			status: 200,
			headers: { get: () => null },
			text: async () => "[]",
			json: async () => [],
		} as unknown as Response);
		await getInbox(25);
		const [url, opts] = fetchMock.mock.calls[0];
		expect(url).toBe("/api/v1/inbox?limit=25");
		expect(opts.method).toBe("GET");
	});
});
