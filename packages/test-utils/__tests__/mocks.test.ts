import { describe, expect, it } from "vitest";
import { mockApiClient } from "../src/mocks";

describe("mockApiClient", () => {
	it("can be invoked without throwing", () => {
		expect(() => mockApiClient()).not.toThrow();
	});
});