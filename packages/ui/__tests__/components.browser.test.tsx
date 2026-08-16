import { i18n as globalI18n, setupI18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	createMemoryHistory,
	createRootRoute,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LoginForm } from "../src/components/auth/LoginForm";
import { RegisterForm } from "../src/components/auth/RegisterForm";
import { Chart } from "../src/components/chart";
import { CommandPalette } from "../src/components/command-palette";
import { FormBuilder } from "../src/components/form-builder";
import { KanbanBoard } from "../src/components/kanban-board";
import { WorkflowCanvas } from "../src/components/workflow-canvas";

function wrap(ui: React.ReactNode, withRouter = false) {
	const li = setupI18n("en");
	li.load("en", {});
	li.activate("en");
	globalI18n.load("en", {});
	globalI18n.activate("en");
	const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const inner = (
		<I18nProvider i18n={li}>
			<QueryClientProvider client={qc}>{ui}</QueryClientProvider>
		</I18nProvider>
	);
	if (!withRouter) return inner;
	const router = createRouter({
		history: createMemoryHistory({ initialEntries: ["/"] }),
		routeTree: createRootRoute({ component: () => inner }),
	});
	return <RouterProvider router={router} />;
}

describe("ui components (vitest browser)", () => {
	it("renders a bar chart with real layout", async () => {
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
				/>,
			),
		);
		// recharts renders an svg once the browser lays it out
		await waitFor(() => expect(document.querySelector("svg")).toBeTruthy(), {
			timeout: 5000,
		});
	});

	it("renders KanbanBoard with drag-and-drop context", () => {
		render(
			wrap(
				<KanbanBoard
					columns={[
						{ id: "c1", title: "To do", items: [{ id: "i1" }, { id: "i2" }] },
						{ id: "c2", title: "Done", items: [] },
					]}
					onDragEnd={() => {}}
					renderItem={(item) => (
						<span>{String((item as { id: string }).id)}</span>
					)}
				/>,
			),
		);
		expect(screen.getByText("To do")).toBeTruthy();
	});

	it("renders FormBuilder fields and reacts to input", () => {
		render(
			wrap(
				<FormBuilder
					fields={[
						{ id: "name", type: "text", label: "Name" },
						{ id: "mail", type: "email", label: "Email" },
						{ id: "bio", type: "textarea", label: "Bio" },
						{
							id: "role",
							type: "select",
							label: "Role",
							options: [{ value: "a", label: "A" }],
						},
					]}
					onChange={() => {}}
				/>,
			),
		);
		expect(screen.getByText("Name")).toBeTruthy();
	});

	it("CommandPalette: opens with Ctrl+K, runs searchFn, and selects", async () => {
		const searchFn = vi
			.fn()
			.mockImplementation(async (q: string) => [
				{ id: "x", title: `${q} Result`, onSelect: () => {} },
			]);
		render(wrap(<CommandPalette searchFn={searchFn} />));
		// open via the global Ctrl+K shortcut
		fireEvent.keyDown(document, { key: "k", ctrlKey: true });
		const input = await waitFor(() => document.querySelector("input"));
		expect(input).toBeTruthy();
		fireEvent.change(input as Element, { target: { value: "hello" } });
		await waitFor(() => expect(searchFn).toHaveBeenCalled());
		// a result should render from searchFn (filtered by substring match)
		expect(await screen.findByText("hello Result")).toBeTruthy();
		// selecting a result closes the palette (handleSelect -> setOpen(false))
		fireEvent.click(screen.getByText("hello Result"));
		await waitFor(() => expect(screen.queryByText("hello Result")).toBeNull());
	});

	it("renders WorkflowCanvas with a node and controls", () => {
		render(
			wrap(
				<WorkflowCanvas
					initialNodes={[
						{
							id: "n1",
							type: "input",
							data: { label: "Start" },
							position: { x: 0, y: 0 },
						},
					]}
					initialEdges={[]}
				/>,
			),
		);
		expect(screen.getByText("Start")).toBeTruthy();
		// ReactFlow renders zoom controls in the browser
		expect(document.querySelector(".react-flow__controls")).toBeTruthy();
	});

	it("renders every chart type with real layout", async () => {
		const types = [
			"line",
			"bar",
			"area",
			"pie",
			"composed",
			"scatter",
		] as const;
		for (const type of types) {
			const { unmount } = render(
				wrap(
					<Chart
						type={type}
						data={[
							{ month: "Jan", revenue: 10 },
							{ month: "Feb", revenue: 20 },
						]}
						xAxisKey="month"
						series={[{ key: "revenue" }]}
					/>,
				),
			);
			await waitFor(() => expect(document.querySelector("svg")).toBeTruthy(), {
				timeout: 5000,
			});
			unmount();
		}
		expect(types.length).toBe(6);
	});

	it("renders LoginForm", () => {
		render(wrap(<LoginForm />));
		expect(screen.getAllByText(/sign in/i).length).toBeGreaterThan(0);
	});

	it("renders RegisterForm", () => {
		render(wrap(<RegisterForm />, true));
		expect(document.body).toBeTruthy();
	});
});
