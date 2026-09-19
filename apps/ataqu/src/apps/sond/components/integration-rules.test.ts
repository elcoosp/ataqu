import { describe, expect, it } from "vitest";
import { setLeadIntegration } from "./integration-rules";

describe("lead integration routing", () => {
	it("adds lead routing without changing authored webhook and conditional rules", () => {
		const rules = [
			{
				conditions: [],
				actions: [
					{ type: "webhook" as const, url: "https://example.test/hook" },
				],
			},
		];
		expect(setLeadIntegration(rules, true)).toEqual([
			...rules,
			{ conditions: [], actions: [{ type: "create_lead", target: "cinq" }] },
		]);
		expect(rules).toHaveLength(1);
	});
	it("removes only the unconditional CINQ action, preserving other actions", () => {
		const rules = [
			{
				conditions: [],
				actions: [
					{ type: "create_lead" as const, target: "cinq" },
					{ type: "notify" as const, target: "host" },
				],
			},
		];
		expect(setLeadIntegration(rules, false)).toEqual([
			{ conditions: [], actions: [{ type: "notify", target: "host" }] },
		]);
	});
	it("is idempotent and preserves conditional lead rules", () => {
		const conditional = {
			conditions: [{ field: "q", operator: "eq" as const, value: "yes" }],
			actions: [{ type: "create_lead" as const, target: "cinq" }],
		};
		const enabled = setLeadIntegration([conditional], true);
		expect(setLeadIntegration(enabled, true)).toEqual(enabled);
		expect(setLeadIntegration(enabled, false)).toEqual([conditional]);
	});
});
