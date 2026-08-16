import { describe, expect, it } from "vitest";
import { deepClone, sleep, buildQueryString, generateIdempotencyKey } from "../src/index";
import { formatCurrency, formatDate, truncateText } from "../src/format";
import { handleApiError } from "../src/error";

describe("format", () => {
	it("formatDate formats a Date", () => {
		const d = new Date("2026-08-16T12:00:00Z");
		expect(formatDate(d)).toContain("2026");
	});

	it("formatDate parses a string date", () => {
		expect(formatDate("2026-08-16T12:00:00Z").length).toBeGreaterThan(0);
	});

	it("formatDate accepts a locale", () => {
		const d = new Date("2026-08-16T12:00:00Z");
		expect(formatDate(d, "fr-FR")).toContain("2026");
	});

	it("formatCurrency formats USD", () => {
		expect(formatCurrency(1234.5, "USD", "en-US")).toContain("$");
	});

	it("formatCurrency honors currency code", () => {
		expect(formatCurrency(1000, "EUR", "de-DE")).toContain("€");
	});

	it("truncateText leaves short text untouched", () => {
		expect(truncateText("hello", 10)).toBe("hello");
	});

	it("truncateText truncates long text", () => {
		expect(truncateText("hello world", 5)).toBe("hello…");
	});
});

describe("clone", () => {
	it("deepClone produces an independent copy", () => {
		const obj = { a: 1, b: { c: 2 } };
		const clone = deepClone(obj);
		clone.b.c = 99;
		expect(obj.b.c).toBe(2);
	});
});

describe("sleep", () => {
	it("resolves after the delay", async () => {
		const start = Date.now();
		await sleep(5);
		expect(Date.now() - start).toBeGreaterThanOrEqual(4);
	});
});

describe("idempotency", () => {
	it("generateIdempotencyKey returns a v4 uuid string", () => {
		const key = generateIdempotencyKey();
		expect(key).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
		);
	});

	it("generateIdempotencyKey returns unique values", () => {
		expect(generateIdempotencyKey()).not.toBe(generateIdempotencyKey());
	});
});

describe("query", () => {
	it("buildQueryString returns empty string when no params", () => {
		expect(buildQueryString({})).toBe("");
	});

	it("buildQueryString skips null/undefined", () => {
		expect(buildQueryString({ a: 1, b: null, c: undefined })).toBe("?a=1");
	});

	it("buildQueryString serializes multiple params", () => {
		expect(buildQueryString({ a: 1, b: "x y" })).toBe("?a=1&b=x+y");
	});
});

describe("error", () => {
	it("handleApiError returns the message when present", () => {
		expect(handleApiError({ message: "boom" })).toBe("boom");
	});

	it("handleApiError falls back to a default message", () => {
		expect(handleApiError(null)).toBe("An unexpected error occurred.");
	});

	it("handleApiError falls back for a non-error object", () => {
		expect(handleApiError({ code: 500 })).toBe("An unexpected error occurred.");
	});
});
