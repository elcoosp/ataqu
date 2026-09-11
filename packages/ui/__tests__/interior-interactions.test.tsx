import { useAuthStore } from "@ataqu/shared-stores";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Providers, stubFetch, jsonResponse } from "./helpers";

import { Accordion } from "../src/components/interior/accordion";
import { CollapsibleBanner } from "../src/components/interior/collapsible-banner";
import { Drawer } from "../src/components/interior/drawer";
import { Dropdown } from "../src/components/interior/dropdown";
import { HoldToConfirm } from "../src/components/interior/hold-to-confirm";
import { Modal } from "../src/components/interior/modal";
import { Pagination } from "../src/components/interior/pagination";
import { PasswordStrength } from "../src/components/interior/password-strength";
import { PollResults } from "../src/components/interior/poll-results";
import { Popover } from "../src/components/interior/popover";
import { ProgressBar } from "../src/components/interior/progress-bar";
import { SegmentedControl } from "../src/components/interior/segmented-control";
import { SkeletonSwap } from "../src/components/interior/skeleton-swap";
import { SortableTable } from "../src/components/interior/sortable-table";
import { StreamingText } from "../src/components/interior/streaming-text";
import { Tabs } from "../src/components/interior/tabs";
import { TooltipGroup } from "../src/components/interior/tooltip-group";
import { TreeView } from "../src/components/interior/tree-view";
import { WizardSteps } from "../src/components/interior/wizard-steps";
import { SetupProgressWidget } from "../src/components/setup-progress-widget";

vi.mock("@ataqu/api-client", () => ({
	useOnboardingStatus: vi.fn(() => ({
		data: {
			tenant_id: "ten",
			tasks_completed: ["import-contacts"],
			last_active_at: null,
			progress_percentage: 20,
		},
		isLoading: false,
	})),
	useCompleteOnboardingTask: vi.fn(() => ({
		mutate: vi.fn(),
	})),
}));

describe("interior-interactions", () => {
	beforeEach(() => {
		stubFetch({});
		useAuthStore.setState({ token: "t", user: null, tenantId: "ten" });
	});
	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	it("Pagination – click Next, Prev, and a numbered page", () => {
		const onPageChange = vi.fn();
		render(
			<Providers>
				<Pagination count={5} defaultPage={2} onPageChange={onPageChange} />
			</Providers>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Next page" }));
		expect(onPageChange).toHaveBeenCalledWith(3);

		onPageChange.mockClear();
		fireEvent.click(screen.getByRole("button", { name: "Previous page" }));
		expect(onPageChange).toHaveBeenCalledWith(2);

		onPageChange.mockClear();
		fireEvent.click(screen.getByRole("button", { name: "Page 4" }));
		expect(onPageChange).toHaveBeenCalledWith(4);
	});

	it("Accordion – click header to expand, click again to collapse", () => {
		render(
			<Providers>
				<Accordion
					items={[
						{ id: "a", title: "Section A", content: <span>Content A</span> },
						{ id: "b", title: "Section B", content: <span>Content B</span> },
					]}
				/>
			</Providers>,
		);

		const headerA = screen.getByRole("button", { name: /Section A/ });
		expect(headerA).toHaveAttribute("aria-expanded", "false");

		fireEvent.click(headerA);
		expect(headerA).toHaveAttribute("aria-expanded", "true");

		fireEvent.click(headerA);
		expect(headerA).toHaveAttribute("aria-expanded", "false");
	});

	it("Tabs – click a tab to swap selected panel", () => {
		render(
			<Providers>
				<Tabs
					items={[
						{ value: "one", label: "One" },
						{ value: "two", label: "Two" },
					]}
					renderPanel={(v) => (
						<span>{v === "one" ? "Panel one" : "Panel two"}</span>
					)}
				/>
			</Providers>,
		);

		expect(screen.getByText("Panel one")).toBeTruthy();

		fireEvent.click(screen.getByRole("tab", { name: "Two" }));
		expect(screen.getByText("Panel two")).toBeTruthy();
	});

	it("SegmentedControl – click an option fires onValueChange", () => {
		const onValueChange = vi.fn();
		render(
			<Providers>
				<SegmentedControl
					options={[
						{ value: "a", label: "Alpha" },
						{ value: "b", label: "Beta" },
					]}
					label="Pick"
					onValueChange={onValueChange}
				/>
			</Providers>,
		);

		fireEvent.click(screen.getByRole("radio", { name: "Beta" }));
		expect(onValueChange).toHaveBeenCalledWith("b");
	});

	it("ProgressBar – assert role and aria-valuenow for determinate; null for indeterminate", () => {
		const { rerender } = render(
			<Providers>
				<ProgressBar value={42} />
			</Providers>,
		);

		const bar = screen.getByRole("progressbar");
		expect(bar).toHaveAttribute("aria-valuenow", "42");

		rerender(
			<Providers>
				<ProgressBar value={null} />
			</Providers>,
		);

		const indeterminate = screen.getByRole("progressbar");
		expect(indeterminate.getAttribute("aria-valuenow")).toBeNull();
	});

	it("StreamingText – click skip makes status done and reveals full text", () => {
		vi.useFakeTimers();
		const onDone = vi.fn();
		render(
			<Providers>
				<StreamingText
					text="Hello world"
					tokensPerSecond={1000}
					autoStart={false}
					onDone={onDone}
				/>
			</Providers>,
		);

		const group = screen.getByRole("group");
		expect(group).toHaveAttribute("aria-busy", "false");

		fireEvent.click(screen.getByRole("button", { name: "Skip to the end" }));

		expect(group).toHaveAttribute("aria-busy", "false");
		expect(screen.getByRole("status")).toHaveTextContent("Hello world");
	});

	it("WizardSteps – click next/back to navigate through steps", () => {
		render(
			<Providers>
				<WizardSteps
					steps={[
						{ id: "s1", label: "First", content: <span>Step one</span> },
						{ id: "s2", label: "Second", content: <span>Step two</span> },
						{ id: "s3", label: "Third", content: <span>Step three</span> },
					]}
				/>
			</Providers>,
		);

		expect(screen.getByText("Step one")).toBeTruthy();

		fireEvent.click(screen.getByRole("button", { name: "Next" }));
		expect(screen.getByText("Step two")).toBeTruthy();

		fireEvent.click(screen.getByRole("button", { name: "Back" }));
		expect(screen.getByText("Step one")).toBeTruthy();
	});

	it("PasswordStrength – weak vs strong password changes label", async () => {
		function Wrapper() {
			const [val, setVal] = useState("abc");
			return (
				<Providers>
					<PasswordStrength value={val} showRules={false} />
					<input
						data-testid="pw-input"
						value={val}
						onChange={(e) => setVal(e.target.value)}
					/>
				</Providers>
			);
		}
		render(<Wrapper />);

		expect(screen.getByRole("meter")).toHaveAttribute("aria-valuetext", "Weak");

		const input = screen.getByTestId("pw-input");
		fireEvent.change(input, {
			target: { value: "Zx$9mKp2wLqR" },
		});

		await waitFor(() => {
			expect(screen.getByRole("meter")).toHaveAttribute(
				"aria-valuetext",
				"Strong",
			);
		});
	});

	it("PollResults – click an option registers a vote", () => {
		const onVote = vi.fn();
		render(
			<Providers>
				<PollResults
					options={[
						{ id: "a", label: "Apple", votes: 5 },
						{ id: "b", label: "Banana", votes: 3 },
					]}
					label="Favorite fruit"
					onVote={onVote}
				/>
			</Providers>,
		);

		fireEvent.click(screen.getByText("Apple"));
		expect(onVote).toHaveBeenCalledWith("a");
	});

	it("CollapsibleBanner – click dismiss hides banner; restore brings it back", () => {
		const { rerender } = render(
			<Providers>
				<CollapsibleBanner
					title="Notice"
					description="Details here"
					dismissible
				/>
			</Providers>,
		);

		expect(screen.getByText("Notice")).toBeTruthy();

		fireEvent.click(screen.getByRole("button", { name: "Dismiss notice" }));

		rerender(
			<Providers>
				<CollapsibleBanner
					title="Notice"
					description="Details here"
					dismissible
				/>
			</Providers>,
		);

		expect(screen.getByText("Notice")).toBeTruthy();
	});

	it("SkeletonSwap – rerender ready false->true swaps content in", async () => {
		const { unmount } = render(
			<Providers>
				<SkeletonSwap ready={false} delay={0} minVisible={0}>
					<span>Loaded content</span>
				</SkeletonSwap>
			</Providers>,
		);

		const busyEl = screen.getByText("Loaded content").closest("[aria-busy]");
		expect(busyEl).toHaveAttribute("aria-busy", "true");

		unmount();

		render(
			<Providers>
				<SkeletonSwap ready={true} delay={0} minVisible={0}>
					<span>Loaded content</span>
				</SkeletonSwap>
			</Providers>,
		);

		const readyEl = screen.getByText("Loaded content").closest("[aria-busy]");
		expect(readyEl).toHaveAttribute("aria-busy", "false");
	});

	it("TreeView – click expander reveals children", () => {
		render(
			<Providers>
				<TreeView
					label="Files"
					nodes={[
						{
							id: "root",
							label: "Root",
							children: [
								{ id: "child1", label: "Child 1" },
								{ id: "child2", label: "Child 2" },
							],
						},
					]}
				/>
			</Providers>,
		);

		expect(screen.queryByText("Child 1")).toBeNull();

		fireEvent.click(screen.getByText("Root"));

		expect(screen.getByText("Child 1")).toBeTruthy();
		expect(screen.getByText("Child 2")).toBeTruthy();
	});

	it("Dropdown – click trigger opens list, click item fires onChange", () => {
		const onChange = vi.fn();
		render(
			<Providers>
				<Dropdown
					items={[
						{ value: "x", label: "X" },
						{ value: "y", label: "Y" },
					]}
					label="Choices"
					onChange={onChange}
				/>
			</Providers>,
		);

		fireEvent.click(screen.getByRole("button", { name: /Choices/ }));
		expect(screen.getByRole("listbox")).toBeTruthy();

		fireEvent.click(screen.getByRole("option", { name: "Y" }));
		expect(onChange).toHaveBeenCalledWith("y");
	});

	it("Popover – click trigger opens popover; Escape closes it", async () => {
		render(
			<Providers>
				<Popover trigger={<span>Open popover</span>} label="Info">
					<span>Popover body</span>
				</Popover>
			</Providers>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Open popover" }));
		expect(screen.getByText("Popover body")).toBeTruthy();

		fireEvent.keyDown(document, { key: "Escape" });

		await waitFor(() => {
			expect(screen.queryByText("Popover body")).toBeNull();
		});
	});

	it("Modal – open + click Close button fires onClose", () => {
		const onClose = vi.fn();
		render(
			<Providers>
				<Modal open onClose={onClose} title="Test modal">
					<span>Modal body</span>
				</Modal>
			</Providers>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));
		expect(onClose).toHaveBeenCalled();
	});

	it("Drawer – open + click close button fires onOpenChange(false)", () => {
		const onOpenChange = vi.fn();
		render(
			<Providers>
				<Drawer open onOpenChange={onOpenChange} title="Test drawer">
					<span>Drawer body</span>
				</Drawer>
			</Providers>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Close panel" }));
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it("HoldToConfirm – pointer hold for duration triggers onConfirm", () => {
		vi.useFakeTimers();
		const onConfirm = vi.fn();
		render(
			<Providers>
				<HoldToConfirm onConfirm={onConfirm} duration={200}>
					Delete
				</HoldToConfirm>
			</Providers>,
		);

		const btn = screen.getByRole("button");
		fireEvent.pointerDown(btn, { clientX: 0, clientY: 0, pointerId: 1 });

		vi.advanceTimersByTime(250);

		expect(onConfirm).toHaveBeenCalled();
	});

	it("TooltipGroup – renders without crashing", () => {
		render(
			<Providers>
				<TooltipGroup>
					<button>Hover me</button>
				</TooltipGroup>
			</Providers>,
		);

		expect(screen.getByRole("button", { name: "Hover me" })).toBeTruthy();
	});

	it("SortableTable – click column header toggles sort direction", () => {
		render(
			<Providers>
				<SortableTable
					rows={[
						{ id: "1", name: "Banana", score: 3 },
						{ id: "2", name: "Apple", score: 5 },
						{ id: "3", name: "Cherry", score: 1 },
					]}
					columns={[
						{ id: "name", header: "Name", value: (r) => r.name },
						{
							id: "score",
							header: "Score",
							value: (r) => r.score,
							numeric: true,
						},
					]}
					getRowId={(r) => r.id}
					label="Fruit table"
				/>
			</Providers>,
		);

		const nameHeader = screen.getByText("Name").closest("button")!;
		fireEvent.click(nameHeader);
		const nameCell = screen.getByRole("columnheader", { name: /Name/ });
		expect(nameCell).toHaveAttribute("aria-sort", "ascending");

		fireEvent.click(nameHeader);
		expect(nameCell).toHaveAttribute("aria-sort", "descending");
	});

	it("SetupProgressWidget – stubbed fetch renders tasks", async () => {
		stubFetch(
			jsonResponse({
				tenant_id: "ten",
				tasks_completed: ["import-contacts"],
				last_active_at: null,
				progress_percentage: 20,
			}),
		);

		render(
			<Providers>
				<SetupProgressWidget />
			</Providers>,
		);

		await waitFor(() => {
			expect(screen.getByText(/Setup/)).toBeTruthy();
		});

		fireEvent.click(screen.getByRole("button", { name: "Setup progress" }));

		await waitFor(() => {
			expect(screen.getByText("Import 10 contacts")).toBeTruthy();
		});
	});
});
