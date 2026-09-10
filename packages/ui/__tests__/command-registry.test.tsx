import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AppCommand } from "../src/command-registry";
import {
	CommandRegistryProvider,
	useAllCommands,
	useCommandRegistry,
	useRegisterCommands,
} from "../src/command-registry";

function cmds(...pairs: Array<[string, string]>): AppCommand[] {
	return pairs.map(([id, title]) => ({ id, title, onSelect: () => {} }));
}

function Consumer({ items }: { items: AppCommand[] }) {
	useRegisterCommands(items);
	const all = useAllCommands();
	return <span data-testid="count">{all.length}</span>;
}

afterEach(() => vi.restoreAllMocks());

describe("command-registry", () => {
	it("registers, dedupes by id, and cleans up on unmount", async () => {
		const view = render(
			<CommandRegistryProvider>
				<Consumer items={cmds(["a", "A"])} />
			</CommandRegistryProvider>,
		);
		expect(await screen.findByTestId("count")).toHaveTextContent("1");
		view.rerender(
			<CommandRegistryProvider>
				<Consumer items={cmds(["a", "A2"], ["b", "B"])} />
			</CommandRegistryProvider>,
		);
		expect(await screen.findByTestId("count")).toHaveTextContent("2");
		view.unmount();
	});

	it("unregister removes commands", () => {
		let ctx!: ReturnType<typeof useCommandRegistry>;
		function Probe() {
			ctx = useCommandRegistry()!;
			return <div />;
		}
		render(
			<CommandRegistryProvider>
				<Probe />
			</CommandRegistryProvider>,
		);
		act(() => ctx.register(cmds(["x", "X"])));
		expect(ctx.commands).toHaveLength(1);
		act(() => ctx.unregister(["x"]));
		expect(ctx.commands).toHaveLength(0);
	});

	it("useRegisterCommands warns outside a provider", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		function Outside() {
			useRegisterCommands(cmds(["a", "A"]));
			return <span />;
		}
		render(<Outside />);
		expect(warn).toHaveBeenCalled();
	});
});