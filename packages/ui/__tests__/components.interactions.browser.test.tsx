import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { i18n as globalI18n } from "@lingui/core";
import { setupI18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { describe, expect, it, vi } from "vitest";
import { KanbanBoard } from "../src/components/kanban-board";
import { FormBuilder } from "../src/components/form-builder";
import { Chart } from "../src/components/chart";

function wrap(ui: React.ReactNode) {
	const li = setupI18n("en");
	li.load("en", {});
	li.activate("en");
	globalI18n.load("en", {});
	globalI18n.activate("en");
	const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	return (
		<I18nProvider i18n={li}>
			<QueryClientProvider client={qc}>{ui}</QueryClientProvider>
		</I18nProvider>
	);
}

describe("ui component interactions (vitest browser)", () => {
	it("KanbanBoard: clicking the add button fires onAddItem with the column id", () => {
		const onAddItem = vi.fn();
		render(
			wrap(
				<KanbanBoard
					columns={[{ id: "c1", title: "To do", items: [{ id: "i1" }] }]}
					onAddItem={onAddItem}
					renderItem={(item) => (
						<span>{String((item as { id: string }).id)}</span>
					)}
				/>,
			),
		);
		// locate the add (+) button inside the only column header
		const addButtons = document.querySelectorAll(
			'button[class*="text-gray-400"]',
		);
		expect(addButtons.length).toBeGreaterThan(0);
		fireEvent.click(addButtons[0] as Element);
		expect(onAddItem).toHaveBeenCalledWith("c1");
	});

	it("FormBuilder: add and remove field buttons fire onChange", () => {
		const onChange = vi.fn();
		render(
			wrap(
				<FormBuilder
					fields={[{ id: "a", type: "text", label: "A" }]}
					onChange={onChange}
				/>,
			),
		);
		fireEvent.click(screen.getByText("+ Text"));
		expect(onChange).toHaveBeenCalled();
		const callCount = onChange.mock.calls.length;
		const deleteButtons = screen.getAllByRole("button");
		fireEvent.click(deleteButtons[deleteButtons.length - 1]);
		expect(onChange.mock.calls.length).toBeGreaterThan(callCount);
	});

	it("Chart: hovering a bar reveals the tooltip", async () => {
		render(
			wrap(
				<Chart
					type="bar"
					data={[
						{ month: "Jan", revenue: 10 },
						{ month: "Feb", revenue: 20 },
					]}
					xAxisKey="month"
					series={[{ key: "revenue" }]}
					showTooltip
				/>,
			),
		);
		const svg = await waitFor(() => document.querySelector("svg"));
		expect(svg).toBeTruthy();
		// a bar is an SVG <path> inside the chart surface
		const bars = document.querySelectorAll(".recharts-bar-rectangle");
		expect(bars.length).toBeGreaterThan(0);
		fireEvent.mouseOver(bars[0] as Element);
		// recharts shows the tooltip content once active
		await waitFor(
			() =>
				expect(document.querySelector(".recharts-tooltip-wrapper")).toBeTruthy(),
			{ timeout: 4000 },
		);
	});
});
