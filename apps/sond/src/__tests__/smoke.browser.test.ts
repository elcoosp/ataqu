import { describe, expect, it } from "vitest";

describe("SOND App", () => {
	it("should pass smoke test", () => {
		expect(1 + 1).toBe(2);
	});

	it("should have browser APIs available", () => {
		expect(typeof window).toBe("object");
		expect(typeof document).toBe("object");
	});
});
