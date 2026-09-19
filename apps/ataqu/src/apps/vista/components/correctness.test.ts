import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
	readFileSync(`${process.cwd()}/apps/ataqu/src/${path}`, "utf8");
describe("Vista truthful transport and data", () => {
	it("polls instead of opening a nonexistent event stream", () => {
		const hook = read("apps/vista/hooks/use-sse.ts");
		expect(hook).not.toContain("new EventSource");
		expect(hook).toContain("refetchInterval");
		expect(read("routes/_auth/vista/dashboard/$id.tsx")).not.toContain(
			"/stream",
		);
	});
	it("labels its actual polling transport", () => {
		expect(read("apps/vista/components/sse-indicator.tsx")).toContain(
			"Auto-refresh",
		);
		expect(read("apps/vista/components/sse-indicator.tsx")).not.toContain(
			"realtime stream",
		);
	});
	it("fetches KPI widget data and never displays fabricated metrics", () => {
		expect(read("apps/vista/hooks/use-widget-data.ts")).not.toContain(
			'w.type !== "kpi"',
		);
		expect(read("apps/vista/components/dashboard-grid.tsx")).not.toContain(
			'value="12,345"',
		);
	});
	it("does not call nonexistent export or SQL endpoints", () => {
		expect(read("apps/vista/components/export-buttons.tsx")).not.toContain(
			"/export`",
		);
		expect(read("apps/vista/components/sql-editor.tsx")).not.toContain(
			'"/vista/explore"',
		);
	});
});
