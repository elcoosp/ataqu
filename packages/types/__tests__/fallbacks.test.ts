import { describe, expect, it } from "vitest";
import { defaultUser, isApiError } from "../src/fallbacks";

describe("defaultUser", () => {
	it("returns a valid default user", () => {
		const u = defaultUser();
		expect(u.id).toBeTruthy();
		expect(u.roles).toContain("member");
	});

	it("applies overrides", () => {
		const u = defaultUser({ email: "x@y.z", roles: ["admin"] });
		expect(u.email).toBe("x@y.z");
		expect(u.roles).toEqual(["admin"]);
	});
});

describe("isApiError", () => {
	it("accepts a well-formed ApiError", () => {
		expect(isApiError({ code: 404, message: "nope" })).toBe(true);
	});
	it("rejects null", () => {
		expect(isApiError(null)).toBe(false);
	});
	it("rejects an object missing fields", () => {
		expect(isApiError({ message: "x" })).toBe(false);
	});
	it("rejects non-objects", () => {
		expect(isApiError("error")).toBe(false);
	});
});
