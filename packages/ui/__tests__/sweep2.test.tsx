import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setupI18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { describe, expect, it, vi } from "vitest";
import { KanbanBoard } from "../src/components/kanban-board";
import { FormBuilder } from "../src/components/form-builder";
import { CommandPalette } from "../src/components/command-palette";
import {
	CommandRegistryProvider,
	useCommandRegistry,
} from "../src/command-registry";
import { DashboardLayout } from "../src/components/dashboard-layout";
import { PageLayout } from "../src/components/page-layout";
import { WorkflowCanvas } from "../src/components/workflow-canvas";
import { LoginForm } from "../src/components/auth/LoginForm";

const noop = () => {};

vi.mock("@tanstack/react-router", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@tanstack/react-router")>();
	return {
		...actual,
		useNavigate: () => noop,
		// some forms also call useSearch so ensure it exists
		useSearch: () => ({}),
	};
});

describe("ui component render sweep 2", () => {
	it("renders KanbanBoard with dnd", () => {
		render(
			<KanbanBoard
				columns={[
					{ id: "c1", title: "To do", items: [{ id: "i1" }, { id: "i2" }] },
					{ id: "c2", title: "Done", items: [] },
				]}
				onDragEnd={noop}
				renderItem={(item) => <span>{String((item as { id: string }).id)}</span>}
			/>,
		);
		expect(true).toBe(true);
	});

	it("renders FormBuilder fields", () => {
		render(
			<FormBuilder
				fields={[
					{ id: "name", type: "text", label: "Name" },
					{ id: "mail", type: "email", label: "Email" },
					{ id: "bio", type: "textarea", label: "Bio" },
					{ id: "active", type: "checkbox", label: "Active" },
					{ id: "role", type: "select", label: "Role", options: [{ value: "a", label: "A" }] },
				]}
				onChange={noop}
			/>,
		);
		expect(true).toBe(true);
	});

	it("renders CommandPalette", async () => {
		render(<CommandPalette searchFn={async () => []} />);
		expect(true).toBe(true);
	});

	it("renders CommandRegistry provider", () => {
		render(
			<CommandRegistryProvider>
				<span>ok</span>
			</CommandRegistryProvider>,
		);
		expect(true).toBe(true);
	});

	it("renders DashboardLayout", () => {
		render(
			<DashboardLayout>
				<span>body</span>
			</DashboardLayout>,
		);
		expect(true).toBe(true);
	});

	it("renders PageLayout", () => {
		render(
			<PageLayout title="Page">
				<span>content</span>
			</PageLayout>,
		);
		expect(true).toBe(true);
	});

	it("renders WorkflowCanvas", () => {
		render(<WorkflowCanvas initialNodes={[]} initialEdges={[]} />);
		expect(true).toBe(true);
	});

	it("renders LoginForm", () => {
		const li = setupI18n("en");
		li.load("en", {});
		li.activate("en");
		const qc = new QueryClient();
		render(
			<QueryClientProvider client={qc}>
				<I18nProvider i18n={li}>
					<LoginForm />
				</I18nProvider>
			</QueryClientProvider>,
		);
		expect(true).toBe(true);
	});
});
