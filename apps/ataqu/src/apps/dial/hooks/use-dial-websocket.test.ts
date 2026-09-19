import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { normalizeMessageList } from "../api/envelope";

const hookSource = () =>
	readFileSync(
		`${process.cwd()}/apps/ataqu/src/apps/dial/hooks/use-dial-websocket.ts`,
		"utf8",
	);

describe("Dial websocket correctness", () => {
	it("connects to the backend dial ws endpoint", () => {
		expect(hookSource()).toContain("/dial/ws?token=");
		expect(hookSource()).not.toContain('"/ws"');
	});
	it("subscribes on open using the server's snake_case action envelope", () => {
		expect(hookSource()).toContain('"subscribe"');
		expect(hookSource()).toContain("channel_id");
	});
	it("maps the server's flat snake_case event shapes", () => {
		expect(hookSource()).toContain('"message_edited"');
		expect(hookSource()).toContain('"message_deleted"');
		expect(hookSource()).toContain('"typing"');
		expect(hookSource()).not.toContain("data.channelId");
	});
	it("does not nest a hook inside send's callback", () => {
		const source = hookSource();
		const send = source.slice(
			source.indexOf("const send ="),
			source.indexOf("const subscribe ="),
		);
		expect(send).not.toContain("useCallback");
	});
});

describe("Dial message envelope normalization", () => {
	it("accepts the canonical items envelope", () => {
		expect(
			normalizeMessageList({
				items: [{ id: "a" }],
				total: 1,
				limit: 50,
				offset: 0,
			}),
		).toEqual({ items: [{ id: "a" }], total: 1, limit: 50, offset: 0 });
	});
	it("accepts the legacy messages array", () => {
		expect(normalizeMessageList({ messages: [{ id: "b" }] })).toEqual({
			items: [{ id: "b" }],
			total: 1,
			limit: undefined,
			offset: undefined,
		});
	});
});
