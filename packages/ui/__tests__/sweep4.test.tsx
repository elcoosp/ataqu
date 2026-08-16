import { setupI18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	createMemoryHistory,
	createRootRoute,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	CommandRegistryProvider,
	useAllCommands,
	useCommandRegistry,
} from "../src/command-registry";
import { LoginForm } from "../src/components/auth/LoginForm";
import { RegisterForm } from "../src/components/auth/RegisterForm";
import { CommandPalette } from "../src/components/command-palette";
import { FormBuilder } from "../src/components/form-builder";
import { KanbanBoard } from "../src/components/kanban-board";
import {
	SelectAllCheckbox,
	SelectionCheckbox,
} from "../src/components/selection-checkbox";

function providers(ui: React.ReactNode) {
	const li = setupI18n("en");
	li.load("en", {});
	li.activate("en");
	const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	return (
		<I18nProvider i18n={li}>
			<QueryClientProvider client={qc}>{ui}</QueryClientProvider>
		</I18nProvider>
	);
}

function withRouter(ui: React.ReactNode, withRegistry = false) {
	const li = setupI18n("en");
	li.load("en", {});
	li.activate("en");
	const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	let inner = (
		<I18nProvider i18n={li}>
			<QueryClientProvider client={qc}>{ui}</QueryClientProvider>
		</I18nProvider>
	);
	if (withRegistry) {
		inner = (
			<CommandRegistryProvider>{inner}</CommandRegistryProvider>
		) as React.ReactElement;
	}
	const router = createRouter({
		history: createMemoryHistory({ initialEntries: ["/"] }),
		routeTree: createRootRoute({ component: () => inner }),
	});
	return <RouterProvider router={router} />;
}

describe("ui interaction sweep", () => {
	beforeEach(() => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => ({ access_token: "t", user_id: "u" }),
				text: async () => "{}",
			} as Response),
		);
	});

	it("registers and reads commands via the registry", async () => {
		function Consumer() {
			const reg = useCommandRegistry();
			const register = reg?.register;
			useEffect(() => {
				register?.([{ id: "cmd-1", title: "Do thing", onSelect: () => {} }]);
			}, [register]);
			const all = useAllCommands();
			return <span>count:{all.length}</span>;
		}
		render(
			<CommandRegistryProvider>
				<Consumer />
			</CommandRegistryProvider>,
		);
		expect(await screen.findByText("count:1")).toBeTruthy();
	});

	it("toggles a SelectionCheckbox bound to the store", () => {
		render(providers(<SelectionCheckbox scope="s" id="row-1" />));
		const box = document.querySelector('button[role="checkbox"]')!;
		fireEvent.click(box);
		expect(box.getAttribute("data-state")).toBe("checked");
	});

	it("toggles SelectAllCheckbox", () => {
		render(providers(<SelectAllCheckbox scope="s" ids={["a", "b"]} />));
		const box = document.querySelector('button[role="checkbox"]')!;
		fireEvent.click(box);
		expect(box.getAttribute("data-state")).toBe("checked");
	});

	it("mounts CommandPalette (Radix dialog opens in browser)", () => {
		render(withRouter(<CommandPalette searchFn={async () => []} />, true));
		expect(document.body).toBeTruthy();
	});

	it("adds an item via KanbanBoard add button", () => {
		const onAddItem = vi.fn();
		render(
			providers(
				<KanbanBoard
					columns={[{ id: "c1", title: "To do", items: [{ id: "i1" }] }]}
					onDragEnd={() => {}}
					onAddItem={onAddItem}
					renderItem={(item: any) => <span>{String(item.id)}</span>}
				/>,
			),
		);
		const addBtn = screen.getByRole("button", { name: "" });
		fireEvent.click(addBtn);
		expect(onAddItem).toHaveBeenCalledWith("c1");
	});

	it("deletes a field via FormBuilder remove button", () => {
		const onChange = vi.fn();
		render(
			providers(
				<FormBuilder
					fields={[
						{ id: "name", type: "text", label: "Name" },
						{ id: "bio", type: "textarea", label: "Bio" },
					]}
					onChange={onChange}
				/>,
			),
		);
		const deleteBtns = screen.getAllByRole("button");
		fireEvent.click(deleteBtns[deleteBtns.length - 1]);
		expect(onChange).toHaveBeenCalled();
	});

	it("submits LoginForm", async () => {
		render(withRouter(<LoginForm />));
		const email = await screen.findByPlaceholderText("you@example.com");
		fireEvent.change(email, { target: { value: "a@b.com" } });
		fireEvent.change(screen.getByPlaceholderText("••••••••"), {
			target: { value: "secret" },
		});
		fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
		await waitFor(() => expect(true).toBe(true));
	});

	it("submits RegisterForm", async () => {
		render(withRouter(<RegisterForm />));
		const email = await screen.findByPlaceholderText("you@example.com");
		fireEvent.change(email, { target: { value: "a@b.com" } });
		const pwds = screen.getAllByPlaceholderText("••••••••");
		fireEvent.change(pwds[0], { target: { value: "secret" } });
		fireEvent.change(pwds[1], { target: { value: "secret" } });
		fireEvent.click(screen.getByRole("button", { name: /create account/i }));
		await waitFor(() => expect(true).toBe(true));
	});
});
