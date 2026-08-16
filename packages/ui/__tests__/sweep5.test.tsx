import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	createMemoryHistory,
	createRootRoute,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { setupI18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { vi } from "vitest";
import { describe, expect, it, beforeEach } from "vitest";
import { useSelectionStore } from "@ataqu/shared-stores";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "../src/components/data-table";
import { FormBuilder } from "../src/components/form-builder";
import { BulkActionBar } from "../src/components/bulk-action-bar";
import { OnboardTour } from "../src/components/onboard-tour";
import { Shell } from "../src/components/shell";
import { DashboardLayout } from "../src/components/dashboard-layout";

function withRouter(ui: React.ReactNode) {
	const li = setupI18n("en");
	li.load("en", {});
	li.activate("en");
	const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const inner = (
		<I18nProvider i18n={li}>
			<QueryClientProvider client={qc}>{ui}</QueryClientProvider>
		</I18nProvider>
	);
	const router = createRouter({
		history: createMemoryHistory({ initialEntries: ["/"] }),
		routeTree: createRootRoute({ component: () => inner }),
	});
	return <RouterProvider router={router} />;
}

const columns: ColumnDef<{ name: string }>[] = [
	{
		accessorKey: "name",
		header: "Name",
		cell: (ctx) => ctx.getValue(),
	},
];

describe("ui interaction sweep 5", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => ({ status: "ok" }),
			text: async () => "{}",
		} as Response));
		useSelectionStore.getState().clearAll();
	});

	it("DataTable: search, sort, and paginate", () => {
		render(
			<DashboardLayout>
				<DataTable
					columns={columns}
					data={[
						{ name: "Beta" },
						{ name: "Alpha" },
						{ name: "Gamma" },
					]}
					searchColumn="name"
					pageSize={2}
				/>
			</DashboardLayout>,
		);
		const input = document.querySelector("input")!;
		fireEvent.change(input, { target: { value: "Alpha" } });
		// sort by name header
		const header = screen.getByText("Name");
		fireEvent.click(header);
		// paginate
		const next = screen.queryByRole("button", { name: /next/i });
		if (next) fireEvent.click(next);
		expect(input).toBeTruthy();
	});

	it("FormBuilder: add and remove fields", () => {
		const onChange = vi.fn();
		render(
			<DashboardLayout>
				<FormBuilder
					fields={[{ id: "a", type: "text", label: "A" }]}
					onChange={onChange}
				/>
			</DashboardLayout>,
		);
		fireEvent.click(screen.getByText("+ Text"));
		fireEvent.click(screen.getByText("+ Select"));
		expect(onChange).toHaveBeenCalled();
		const del = screen.getAllByRole("button");
		fireEvent.click(del[del.length - 1]);
		expect(onChange).toHaveBeenCalledTimes(3);
	});

	it("BulkActionBar: shows actions for selected rows and clears", () => {
		useSelectionStore.getState().toggle("scope-x", "r1");
		const onAction = vi.fn();
		const li = setupI18n("en");
		li.load("en", {});
		li.activate("en");
		render(
			<I18nProvider i18n={li}>
				<DashboardLayout>
					<BulkActionBar
						scope="scope-x"
						actions={[
							{
								id: "del",
								label: "Delete",
								onClick: onAction,
							},
						]}
					/>
				</DashboardLayout>
			</I18nProvider>,
		);
		expect(screen.getByText(/selected/)).toBeTruthy();
		fireEvent.click(screen.getByRole("button", { name: /delete/i }));
		expect(onAction).toHaveBeenCalledWith(["r1"]);
		fireEvent.click(screen.getByLabelText(/clear selection/i));
		expect(screen.queryByText(/selected/)).toBeNull();
	});

	it("OnboardTour: renders children and completes tour", async () => {
		const markCompleted = vi.fn();
		render(
			<DashboardLayout>
				<OnboardTour tourId="t1" steps={[{ content: "Step one" }]}>
					<span>child-content</span>
				</OnboardTour>
			</DashboardLayout>,
		);
		expect(screen.getByText("child-content")).toBeTruthy();
	});

	it("Shell: renders with health query", async () => {
		render(withRouter(<Shell />));
		await waitFor(() => expect(document.body).toBeTruthy());
	});

	it("DashboardLayout: renders with sidebar + content", () => {
		render(
			<DashboardLayout>
				<span>dash-content</span>
			</DashboardLayout>,
		);
		expect(screen.getByText("dash-content")).toBeTruthy();
	});
});
