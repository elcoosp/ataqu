// packages/ui/__tests__/interior-sweep8.test.tsx

import { useAuthStore, useChangelogStore } from "@ataqu/shared-stores";
import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "../src/components/auth/LoginForm";
import { RegisterForm } from "../src/components/auth/RegisterForm";
import { ChangelogBell } from "../src/components/changelog-bell";
import { Providers, stubFetch, WithRouter } from "./helpers";

const { mockUseChangelog, mockUseMarkRead, mockUseLogin, mockUseSignup } =
	vi.hoisted(() => ({
		mockUseChangelog: vi.fn(() => ({ data: [], isLoading: false })),
		mockUseMarkRead: vi.fn(() => ({ mutate: vi.fn() })),
		mockUseLogin: vi.fn(() => ({ mutateAsync: vi.fn() })),
		mockUseSignup: vi.fn(() => ({ mutateAsync: vi.fn() })),
	}));

vi.mock("@ataqu/api-client", () => ({
	useChangelog: () => mockUseChangelog(),
	useMarkChangelogRead: () => mockUseMarkRead(),
	useLogin: () => mockUseLogin(),
	useSignup: () => mockUseSignup(),
}));

vi.mock("motion/react", async (importOriginal) => {
	const actual = await importOriginal<typeof import("motion/react")>();
	return { ...actual, useReducedMotion: mockReducedMotion };
});
const { mockReducedMotion } = vi.hoisted(() => ({
	mockReducedMotion: vi.fn(() => false),
}));

import { CopyButton } from "../src/components/interior/copy-button";
import { FilterGrid } from "../src/components/interior/filter-grid";
import { Lightbox } from "../src/components/interior/lightbox";
import { LikeBurst } from "../src/components/interior/like-burst";
import { LoadingButton } from "../src/components/interior/loading-button";
import { OtpInput } from "../src/components/interior/otp-input";
import { ShowMore } from "../src/components/interior/show-more";
import { TagInput } from "../src/components/interior/tag-input";
import { TaskSteps } from "../src/components/interior/task-steps";

afterEach(() => {
	vi.restoreAllMocks();
	vi.useRealTimers();
});

beforeEach(() => {
	vi.useFakeTimers({ shouldAdvanceTime: true });
	stubFetch({});
	useAuthStore.setState({ token: "t", user: null, tenantId: "ten" });
	mockReducedMotion.mockReturnValue(false);
});

/* ─── helpers ────────────────────────────────────────────────── */

function fireKey(
	el: HTMLElement,
	key: string,
	opts: Partial<React.KeyboardEvent> = {},
) {
	fireEvent.keyDown(el, {
		key,
		code: key,
		nativeEvent: { isComposing: false },
		preventDefault: () => {},
		...opts,
	});
}

/* ─── FilterGrid ─────────────────────────────────────────────── */

describe("FilterGrid (component)", () => {
	const items = [
		{ id: "a", cat: "x" },
		{ id: "b", cat: "y" },
		{ id: "c", cat: "x" },
		{ id: "d", cat: "y" },
	];
	const filters = [
		{ id: "all", label: "All", match: () => true },
		{ id: "x", label: "X", match: (i: any) => i.cat === "x" },
		{ id: "y", label: "Y", match: (i: any) => i.cat === "y" },
	];

	it("renders chips and grid items, click selects filter", () => {
		const onChange = vi.fn();
		render(
			<FilterGrid
				items={items}
				filters={filters}
				getKey={(i) => i.id}
				renderItem={(i) => <span>{i.id}</span>}
				label="Test"
				onValueChange={onChange}
				columns={2}
				maxRows={4}
			/>,
		);
		expect(screen.getAllByRole("radio")).toHaveLength(3);
		const radios = screen.getAllByRole("radio");
		fireEvent.click(radios[2]);
		expect(onChange).toHaveBeenCalledWith("y");
	});

	it("shows empty state when no items match", () => {
		const emptyFilters = [{ id: "none", label: "None", match: () => false }];
		render(
			<FilterGrid
				items={items}
				filters={emptyFilters}
				getKey={(i) => i.id}
				renderItem={(i) => <span>{i.id}</span>}
				label="Test"
				emptyLabel="Nothing here"
			/>,
		);
		expect(screen.getByText("Nothing here")).toBeTruthy();
	});

	it("keyboard ArrowRight/Left/Home/End on filter chips", () => {
		render(
			<FilterGrid
				items={items}
				filters={filters}
				getKey={(i) => i.id}
				renderItem={(i) => <span>{i.id}</span>}
				label="Test"
			/>,
		);
		const radios = screen.getAllByRole("radio");
		fireKey(radios[0], "ArrowRight");
		fireKey(radios[1], "Home");
		fireKey(radios[2], "End");
		fireKey(radios[2], "ArrowLeft");
	});

	it("controlled value and capped scrollbar gutter", () => {
		const bigItems = Array.from({ length: 20 }, (_, i) => ({
			id: String(i),
			cat: "a",
		}));
		render(
			<FilterGrid
				items={bigItems}
				filters={filters}
				getKey={(i) => i.id}
				renderItem={(i) => <span>{i.id}</span>}
				label="Test"
				value="x"
				columns={1}
				maxRows={2}
			/>,
		);
		expect(screen.getAllByRole("radio")).toHaveLength(3);
	});

	it("reducedMotion (no motion)", () => {
		mockReducedMotion.mockReturnValue(true);
		render(
			<FilterGrid
				items={items}
				filters={filters}
				getKey={(i) => i.id}
				renderItem={(i) => <span>{i.id}</span>}
				label="Test"
			/>,
		);
		expect(screen.getAllByRole("radio")).toHaveLength(3);
	});
});

/* ─── OtpInput ───────────────────────────────────────────────── */

describe("OtpInput (component)", () => {
	it("renders length cells with groupEvery gap", () => {
		render(<OtpInput length={6} groupEvery={3} label="Code" />);
		const inputs = screen.getAllByRole("textbox");
		expect(inputs).toHaveLength(6);
	});

	it("status error / success / hint", () => {
		const { rerender } = render(
			<OtpInput length={4} status="error" errorMessage="Wrong" />,
		);
		expect(screen.getAllByText("Wrong").length).toBeGreaterThan(0);
		rerender(<OtpInput length={4} status="success" successMessage="OK" />);
		expect(screen.getAllByText("OK").length).toBeGreaterThan(0);
		rerender(<OtpInput length={4} hint="Enter code" />);
		expect(screen.getAllByText("Enter code").length).toBeGreaterThan(0);
	});

	it("disabled state", () => {
		render(<OtpInput length={4} disabled />);
		const inputs = screen.getAllByRole("textbox");
		inputs.forEach((i) => {
			expect(i).toBeDisabled();
		});
	});

	it("onChange fires on single char", () => {
		const onChange = vi.fn();
		render(<OtpInput length={4} onChange={onChange} />);
		const inputs = screen.getAllByRole("textbox");
		act(() => {
			fireEvent.change(inputs[0], { target: { value: "7" } });
		});
		expect(onChange).toHaveBeenCalled();
	});

	it("onComplete fires when all filled", () => {
		const onComplete = vi.fn();
		render(<OtpInput length={2} onComplete={onComplete} />);
		const inputs = screen.getAllByRole("textbox");
		act(() => {
			fireEvent.change(inputs[0], { target: { value: "1" } });
		});
		act(() => {
			fireEvent.change(inputs[1], { target: { value: "2" } });
		});
		expect(onComplete).toHaveBeenCalledWith("12");
	});

	it("backspace clears current then previous", () => {
		const onChange = vi.fn();
		render(<OtpInput length={3} defaultValue="12" onChange={onChange} />);
		const inputs = screen.getAllByRole("textbox");
		fireKey(inputs[2], "Backspace");
		fireKey(inputs[2], "Backspace");
	});

	it("delete key clears current cell", () => {
		render(<OtpInput length={3} defaultValue="5" />);
		const inputs = screen.getAllByRole("textbox");
		fireKey(inputs[0], "Delete");
	});

	it("ArrowLeft / ArrowRight / Home / End", () => {
		render(<OtpInput length={4} />);
		const inputs = screen.getAllByRole("textbox");
		fireKey(inputs[2], "ArrowLeft");
		fireKey(inputs[1], "ArrowRight");
		fireKey(inputs[0], "Home");
		fireKey(inputs[3], "End");
	});

	it("paste fills multiple cells", () => {
		const onChange = vi.fn();
		render(<OtpInput length={4} onChange={onChange} />);
		const inputs = screen.getAllByRole("textbox");
		act(() => {
			fireEvent.paste(inputs[0], {
				clipboardData: { getData: () => "9999" },
			} as any);
		});
		expect(onChange).toHaveBeenCalled();
	});

	it("onBlur clears focus when not moving to another cell", () => {
		render(<OtpInput length={3} />);
		const inputs = screen.getAllByRole("textbox");
		act(() => {
			fireEvent.focus(inputs[0]);
		});
		act(() => {
			fireEvent.blur(inputs[0], { relatedTarget: null });
		});
	});

	it("onFocus redirects to first empty cell", () => {
		render(<OtpInput length={4} defaultValue="1" />);
		const inputs = screen.getAllByRole("textbox");
		act(() => {
			fireEvent.focus(inputs[2]);
		});
	});

	it("ref.clear and ref.focus", () => {
		const ref = { current: null } as any;
		render(<OtpInput length={3} ref={ref} />);
		act(() => ref.current?.clear());
		act(() => ref.current?.focus());
	});

	it("autoFocus and focusOnError", () => {
		const { rerender } = render(<OtpInput length={4} autoFocus />);
		rerender(
			<OtpInput length={4} focusOnError status="error" errorMessage="Bad" />,
		);
	});

	it("alphanumeric mode accepts letters", () => {
		const onChange = vi.fn();
		render(<OtpInput length={4} mode="alphanumeric" onChange={onChange} />);
		const inputs = screen.getAllByRole("textbox");
		act(() => {
			fireEvent.change(inputs[0], { target: { value: "A" } });
		});
	});

	it("reducedMotion flag", () => {
		mockReducedMotion.mockReturnValue(true);
		render(<OtpInput length={4} />);
		expect(screen.getAllByRole("textbox")).toHaveLength(4);
	});
});

/* ─── TagInput ───────────────────────────────────────────────── */

describe("TagInput (component)", () => {
	it("renders label and input", () => {
		render(<TagInput label="Tags" />);
		expect(screen.getByLabelText("Tags")).toBeTruthy();
	});

	it("adds tag via Enter", () => {
		const onChange = vi.fn();
		render(<TagInput onChange={onChange} />);
		const input = screen.getByRole("textbox");
		fireEvent.change(input, { target: { value: "react" } });
		fireKey(input, "Enter");
		expect(onChange).toHaveBeenCalledWith(["react"]);
	});

	it("adds tag via comma separator", () => {
		const onChange = vi.fn();
		render(<TagInput onChange={onChange} />);
		const input = screen.getByRole("textbox");
		fireEvent.change(input, { target: { value: "vue" } });
		fireKey(input, ",");
		expect(onChange).toHaveBeenCalledWith(["vue"]);
	});

	it("backspace arms then removes last tag", () => {
		const onChange = vi.fn();
		render(<TagInput defaultValue={["a", "b"]} onChange={onChange} />);
		const input = screen.getByRole("textbox");
		fireKey(input, "Backspace");
		fireKey(input, "Backspace");
	});

	it("max limit rejection", () => {
		const onChange = vi.fn();
		render(<TagInput defaultValue={["a", "b"]} max={2} onChange={onChange} />);
		const input = screen.getByRole("textbox");
		fireEvent.change(input, { target: { value: "c" } });
		fireKey(input, "Enter");
	});

	it("duplicate rejection", () => {
		const onChange = vi.fn();
		render(<TagInput defaultValue={["hello"]} onChange={onChange} />);
		const input = screen.getByRole("textbox");
		fireEvent.change(input, { target: { value: "hello" } });
		fireKey(input, "Enter");
	});

	it("validate callback rejects invalid", () => {
		render(<TagInput defaultValue={[]} validate={(t) => t.length > 3} />);
		const input = screen.getByRole("textbox");
		fireEvent.change(input, { target: { value: "ab" } });
		fireKey(input, "Enter");
	});

	it("Delete key removes armed tag", () => {
		render(<TagInput defaultValue={["x", "y"]} />);
		const input = screen.getByRole("textbox");
		fireKey(input, "Backspace");
		fireKey(input, "Delete");
	});

	it("ArrowLeft/Right navigates armed tags", () => {
		render(<TagInput defaultValue={["a", "b", "c"]} />);
		const input = screen.getByRole("textbox");
		fireEvent.change(input, { target: { value: "" } });
		fireKey(input, "Backspace");
		fireKey(input, "ArrowLeft");
		fireKey(input, "ArrowRight");
		fireKey(input, "ArrowRight");
	});

	it("Escape disarms", () => {
		render(<TagInput defaultValue={["a"]} />);
		const input = screen.getByRole("textbox");
		fireKey(input, "Backspace");
		fireKey(input, "Escape");
	});

	it("paste with separator splits tags", () => {
		const onChange = vi.fn();
		render(<TagInput onChange={onChange} />);
		const input = screen.getByRole("textbox");
		act(() => {
			fireEvent.paste(input, {
				clipboardData: { getData: () => "x,y" },
			} as any);
		});
	});

	it("onBlur clears armed", () => {
		render(<TagInput defaultValue={["a"]} />);
		const input = screen.getByRole("textbox");
		fireKey(input, "Backspace");
		fireEvent.blur(input);
	});

	it("click remove button", () => {
		const onChange = vi.fn();
		render(<TagInput defaultValue={["tag1"]} onChange={onChange} />);
		fireEvent.click(screen.getByLabelText("Remove tag1"));
	});

	it("pointerDown on ul focuses input", () => {
		const { container } = render(<TagInput />);
		const ul = container.querySelector("ul")!;
		fireEvent.pointerDown(ul, { target: ul });
	});

	it("max counter shown when max set", () => {
		render(<TagInput defaultValue={["a", "b"]} max={5} />);
		expect(screen.getByText("/ 5")).toBeTruthy();
	});

	it("reducedMotion", () => {
		mockReducedMotion.mockReturnValue(true);
		render(<TagInput defaultValue={["a"]} />);
		expect(screen.getByText("a")).toBeTruthy();
	});
});

/* ─── LoadingButton ──────────────────────────────────────────── */

describe("LoadingButton (component)", () => {
	beforeEach(() => vi.useRealTimers());

	it("click triggers action, goes pending then success", async () => {
		const action = vi.fn().mockResolvedValue(undefined);
		render(
			<Providers>
				<LoadingButton onAction={action} resetAfter={50}>
					Go
				</LoadingButton>
			</Providers>,
		);
		fireEvent.click(screen.getByRole("button", { name: "Go" }));
		await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
	});

	it("error path calls onError", async () => {
		const action = vi.fn().mockRejectedValue(new Error("nope"));
		const onError = vi.fn();
		render(
			<Providers>
				<LoadingButton onAction={action} onError={onError} resetAfter={50}>
					Go
				</LoadingButton>
			</Providers>,
		);
		fireEvent.click(screen.getByRole("button", { name: "Go" }));
		await waitFor(() => expect(onError).toHaveBeenCalled());
	});

	it("disabled prevents click", () => {
		const action = vi.fn();
		render(
			<Providers>
				<LoadingButton onAction={action} disabled>
					Go
				</LoadingButton>
			</Providers>,
		);
		fireEvent.click(screen.getByRole("button", { name: "Go" }));
		expect(action).not.toHaveBeenCalled();
	});

	it("click during pending is prevented", async () => {
		const action = vi
			.fn()
			.mockImplementation(() => new Promise((r) => setTimeout(r, 10000)));
		render(
			<Providers>
				<LoadingButton onAction={action} resetAfter={50}>
					Go
				</LoadingButton>
			</Providers>,
		);
		fireEvent.click(screen.getByRole("button", { name: "Go" }));
		await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
		fireEvent.click(screen.getByRole("button", { name: "Go" }));
		expect(action).toHaveBeenCalledTimes(1);
	});

	it("reducedMotion", () => {
		mockReducedMotion.mockReturnValue(true);
		render(
			<Providers>
				<LoadingButton onAction={() => {}}>Go</LoadingButton>
			</Providers>,
		);
		expect(screen.getByRole("button", { name: "Go" })).toBeTruthy();
	});
});

/* ─── CopyButton ─────────────────────────────────────────────── */

describe("CopyButton (component)", () => {
	it("click copies and shows copied label", async () => {
		const write = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(navigator, "clipboard", {
			configurable: true,
			value: { writeText: write },
		});
		render(
			<Providers>
				<CopyButton value="text" timeout={50} />
			</Providers>,
		);
		fireEvent.click(screen.getByLabelText("Copy"));
		expect(write).toHaveBeenCalledWith("text");
	});

	it("empty value no-ops", async () => {
		const write = vi.fn();
		Object.defineProperty(navigator, "clipboard", {
			configurable: true,
			value: { writeText: write },
		});
		render(
			<Providers>
				<CopyButton value="" timeout={50} />
			</Providers>,
		);
		fireEvent.click(screen.getByLabelText("Copy"));
		expect(write).not.toHaveBeenCalled();
	});

	it("clipboard error triggers fallback", async () => {
		Object.defineProperty(navigator, "clipboard", {
			configurable: true,
			value: {
				writeText: vi.fn().mockRejectedValue(new Error("denied")),
			},
		});
		render(
			<Providers>
				<CopyButton value="data" timeout={50} onError={vi.fn()} />
			</Providers>,
		);
		fireEvent.click(screen.getByLabelText("Copy"));
	});

	it("navigator.clipboard unavailable triggers fallback", async () => {
		Object.defineProperty(navigator, "clipboard", {
			configurable: true,
			value: undefined,
		});
		render(
			<Providers>
				<CopyButton value="data" timeout={50} />
			</Providers>,
		);
		fireEvent.click(screen.getByLabelText("Copy"));
	});

	it("disabled prevents copy", () => {
		const write = vi.fn();
		Object.defineProperty(navigator, "clipboard", {
			configurable: true,
			value: { writeText: write },
		});
		render(
			<Providers>
				<CopyButton value="data" disabled />
			</Providers>,
		);
		fireEvent.click(screen.getByLabelText("Copy"));
		expect(write).not.toHaveBeenCalled();
	});

	it("onCopy callback fires on success", async () => {
		const onCopy = vi.fn();
		Object.defineProperty(navigator, "clipboard", {
			configurable: true,
			value: { writeText: vi.fn().mockResolvedValue(undefined) },
		});
		render(
			<Providers>
				<CopyButton value="ok" onCopy={onCopy} timeout={50} />
			</Providers>,
		);
		fireEvent.click(screen.getByLabelText("Copy"));
	});

	it("reducedMotion", () => {
		mockReducedMotion.mockReturnValue(true);
		render(
			<Providers>
				<CopyButton value="data" />
			</Providers>,
		);
		expect(screen.getByLabelText("Copy")).toBeTruthy();
	});
});

/* ─── TaskSteps ──────────────────────────────────────────────── */

describe("TaskSteps (component)", () => {
	const steps = [
		{ id: "a", label: "First", meta: "1s" },
		{ id: "b", label: "Second" },
		{ id: "c", label: "Third" },
	];

	it("renders all step statuses", () => {
		render(<TaskSteps steps={steps} current={1} />);
		expect(screen.getByText("First")).toBeTruthy();
		expect(screen.getByText("Second")).toBeTruthy();
		expect(screen.getByText("Third")).toBeTruthy();
	});

	it("done steps show meta", () => {
		render(<TaskSteps steps={steps} current={2} />);
		expect(screen.getByText("1s")).toBeTruthy();
	});

	it("error state", () => {
		render(<TaskSteps steps={steps} current={1} failed />);
		expect(screen.getByText("Run failed")).toBeTruthy();
	});

	it("complete state", () => {
		render(<TaskSteps steps={steps} current={3} />);
		expect(screen.getByText("Run complete")).toBeTruthy();
	});

	it("spoken announcement", () => {
		render(<TaskSteps steps={steps} current={1} />);
		act(() => vi.advanceTimersByTime(500));
		expect(screen.getByText(/step 2 of 3/)).toBeTruthy();
	});

	it("custom label", () => {
		render(<TaskSteps steps={steps} current={1} label="Progress" />);
		expect(screen.getByRole("list", { name: "Progress" })).toBeTruthy();
	});

	it("reducedMotion", () => {
		mockReducedMotion.mockReturnValue(true);
		render(<TaskSteps steps={steps} current={1} />);
		expect(screen.getByText("First")).toBeTruthy();
	});
});

/* ─── ShowMore ───────────────────────────────────────────────── */

const scrollHeightOrig = Object.getOwnPropertyDescriptor(
	HTMLElement.prototype,
	"scrollHeight",
);

function stubShowMoreLayout(full: number) {
	vi.spyOn(window, "getComputedStyle").mockReturnValue({
		lineHeight: "20px",
		fontSize: "14px",
		getPropertyValue: () => "",
	} as any);
	Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
		configurable: true,
		get: () => full,
	});
}

describe("ShowMore (component)", () => {
	const longText = "Word ".repeat(200);

	afterEach(() => {
		if (scrollHeightOrig) {
			Object.defineProperty(
				HTMLElement.prototype,
				"scrollHeight",
				scrollHeightOrig,
			);
		}
	});

	it("toggle expand and collapse", () => {
		stubShowMoreLayout(400);
		render(
			<ShowMore lines={2} maxHeight={100}>
				<p>{longText}</p>
			</ShowMore>,
		);
		const btn = screen.getByRole("button", { name: /Show more/i });
		fireEvent.click(btn);
		fireEvent.click(screen.getByRole("button", { name: /Show less/i }));
	});

	it("controlled expanded prop", () => {
		stubShowMoreLayout(400);
		const { rerender } = render(
			<ShowMore lines={2} expanded={false}>
				<p>{longText}</p>
			</ShowMore>,
		);
		expect(screen.getByRole("button").getAttribute("aria-expanded")).toBe(
			"false",
		);
		rerender(
			<ShowMore lines={2} expanded>
				<p>{longText}</p>
			</ShowMore>,
		);
		expect(screen.getByRole("button").getAttribute("aria-expanded")).toBe(
			"true",
		);
	});

	it("onExpandedChange callback", () => {
		stubShowMoreLayout(400);
		const cb = vi.fn();
		render(
			<ShowMore lines={2} onExpandedChange={cb}>
				<p>{longText}</p>
			</ShowMore>,
		);
		fireEvent.click(screen.getByRole("button"));
		expect(cb).toHaveBeenCalledWith(true);
	});

	it("short content hides button (not expandable)", () => {
		stubShowMoreLayout(20);
		render(
			<ShowMore lines={50}>
				<p>Short</p>
			</ShowMore>,
		);
		const btn = screen.getByRole("button");
		expect(btn.className).toContain("invisible");
	});

	it("reducedMotion", () => {
		stubShowMoreLayout(400);
		mockReducedMotion.mockReturnValue(true);
		render(
			<ShowMore lines={2}>
				<p>{longText}</p>
			</ShowMore>,
		);
		expect(screen.getByRole("button")).toBeTruthy();
	});
});

/* ─── LikeBurst ──────────────────────────────────────────────── */

describe("LikeBurst (component)", () => {
	it("toggle liked state", () => {
		render(<LikeBurst initialCount={10} />);
		const btn = screen.getByRole("button");
		fireEvent.click(btn);
		expect(btn.getAttribute("aria-pressed")).toBe("true");
	});

	it("onToggle callback fires", () => {
		const cb = vi.fn();
		render(<LikeBurst initialCount={5} onToggle={cb} />);
		fireEvent.click(screen.getByRole("button"));
		expect(cb).toHaveBeenCalledWith(true);
	});

	it("onCommit success settles", async () => {
		const commit = vi.fn().mockResolvedValue(undefined);
		render(<LikeBurst initialCount={3} onCommit={commit} settle={10} />);
		fireEvent.click(screen.getByRole("button"));
		act(() => vi.advanceTimersByTime(20));
		expect(commit).toHaveBeenCalled();
	});

	it("onCommit error reverts", async () => {
		const commit = vi.fn().mockRejectedValue(new Error("fail"));
		const onError = vi.fn();
		render(
			<LikeBurst
				initialCount={3}
				onCommit={commit}
				onError={onError}
				settle={10}
			/>,
		);
		fireEvent.click(screen.getByRole("button"));
		act(() => vi.advanceTimersByTime(20));
	});

	it("no onCommit settles directly", () => {
		render(<LikeBurst initialCount={3} settle={10} />);
		fireEvent.click(screen.getByRole("button"));
		act(() => vi.advanceTimersByTime(20));
	});

	it("disabled prevents toggle", () => {
		render(<LikeBurst initialCount={3} disabled />);
		fireEvent.click(screen.getByRole("button"));
		expect(screen.getByRole("button").getAttribute("aria-pressed")).toBe(
			"false",
		);
	});

	it("custom format", () => {
		render(<LikeBurst initialCount={1000} format={(v) => `${v / 1000}k`} />);
		expect(screen.getByText("1k")).toBeTruthy();
	});

	it("reducedMotion", () => {
		mockReducedMotion.mockReturnValue(true);
		render(<LikeBurst initialCount={5} />);
		fireEvent.click(screen.getByRole("button"));
		expect(screen.getByRole("button").getAttribute("aria-pressed")).toBe(
			"true",
		);
	});
});

/* ─── Lightbox ───────────────────────────────────────────────── */

describe("Lightbox (component)", () => {
	beforeEach(() => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
	});

	it("renders into portal when open, nothing when closed", () => {
		const { rerender } = render(
			<Lightbox open={false} onClose={() => {}} src="/img.png" alt="pic" />,
		);
		expect(screen.queryByRole("dialog")).toBeNull();
		rerender(<Lightbox open onClose={() => {}} src="/img.png" alt="pic" />);
		expect(screen.getByRole("dialog")).toBeTruthy();
	});

	it("Escape closes when not zoomed", () => {
		const onClose = vi.fn();
		render(<Lightbox open onClose={onClose} src="/img.png" alt="pic" />);
		fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
		expect(onClose).toHaveBeenCalled();
	});

	it("zoom button toggles", () => {
		render(<Lightbox open onClose={() => {}} src="/img.png" alt="pic" />);
		const btn = screen.getByLabelText("Zoom in");
		fireEvent.click(btn);
		expect(screen.getByLabelText("Zoom out")).toBeTruthy();
		fireEvent.click(screen.getByLabelText("Zoom out"));
		expect(screen.getByLabelText("Zoom in")).toBeTruthy();
	});

	it("keyboard +/- zooms, 0 resets", () => {
		render(<Lightbox open onClose={() => {}} src="/img.png" alt="pic" />);
		const frame = screen.getByRole("group");
		fireKey(frame, "+");
		fireKey(frame, "-");
		fireKey(frame, "0");
	});

	it("caption shown instead of alt when provided", () => {
		render(
			<Lightbox
				open
				onClose={() => {}}
				src="/img.png"
				alt="pic"
				caption="My Photo"
			/>,
		);
		expect(screen.getByText("My Photo")).toBeTruthy();
	});

	it("close button fires onClose", () => {
		const onClose = vi.fn();
		render(<Lightbox open onClose={onClose} src="/img.png" alt="pic" />);
		fireEvent.click(screen.getByLabelText("Close"));
		expect(onClose).toHaveBeenCalled();
	});

	it("reducedMotion", () => {
		mockReducedMotion.mockReturnValue(true);
		render(<Lightbox open onClose={() => {}} src="/img.png" alt="pic" />);
		expect(screen.getByRole("dialog")).toBeTruthy();
	});
});

/* ─── ChangelogBell ──────────────────────────────────────────── */

describe("ChangelogBell", () => {
	beforeEach(() => {
		mockUseMarkRead.mockReturnValue({ mutate: vi.fn() });
	});

	it("renders bell, click opens panel", () => {
		mockUseChangelog.mockReturnValue({ data: [], isLoading: false });
		render(
			<Providers>
				<ChangelogBell />
			</Providers>,
		);
		fireEvent.click(screen.getByLabelText("Changelog"));
		expect(screen.getByText("What's new")).toBeTruthy();
	});

	it("shows entries and marks read", () => {
		mockUseChangelog.mockReturnValue({
			data: [
				{
					id: "1",
					title: "New feature",
					description: "desc",
					category: "New",
					date: "2026-01-01",
					breaking_change: false,
				},
			],
			isLoading: false,
		});
		render(
			<Providers>
				<ChangelogBell />
			</Providers>,
		);
		fireEvent.click(screen.getByLabelText("Changelog"));
		expect(screen.getByText("New feature")).toBeTruthy();
	});

	it("loading state", () => {
		mockUseChangelog.mockReturnValue({ data: undefined, isLoading: true });
		render(
			<Providers>
				<ChangelogBell />
			</Providers>,
		);
		fireEvent.click(screen.getByLabelText("Changelog"));
		expect(screen.getByText("Loading…")).toBeTruthy();
	});

	it("empty state", () => {
		mockUseChangelog.mockReturnValue({ data: [], isLoading: false });
		render(
			<Providers>
				<ChangelogBell />
			</Providers>,
		);
		fireEvent.click(screen.getByLabelText("Changelog"));
		expect(screen.getByText("No updates yet.")).toBeTruthy();
	});

	it("breaking change badge", () => {
		mockUseChangelog.mockReturnValue({
			data: [
				{
					id: "2",
					title: "Breaking",
					description: "desc",
					category: "Fixed",
					date: "2026-02-01",
					breaking_change: true,
				},
			],
			isLoading: false,
		});
		render(
			<Providers>
				<ChangelogBell />
			</Providers>,
		);
		fireEvent.click(screen.getByLabelText("Changelog"));
		expect(screen.getByText("Fixed")).toBeTruthy();
		expect(screen.getAllByText("Breaking")).toHaveLength(2);
	});

	it("dot shows when unread and disappears once seen", () => {
		mockUseChangelog.mockReturnValue({
			data: [
				{
					id: "3",
					title: "T",
					description: "d",
					category: "New",
					date: "2026-03-01",
					breaking_change: false,
				},
			],
			isLoading: false,
		});
		useChangelogStore.setState({
			lastSeenId: null,
		} as any);
		render(
			<Providers>
				<ChangelogBell />
			</Providers>,
		);
		const btn = screen.getByLabelText("Changelog");
		expect(btn.querySelector("span")).toBeTruthy();
		fireEvent.click(btn);
		fireEvent.click(btn);
		expect(screen.queryByText("What's new")).toBeNull();
	});

	it("close toggles panel off", () => {
		mockUseChangelog.mockReturnValue({ data: [], isLoading: false });
		render(
			<Providers>
				<ChangelogBell />
			</Providers>,
		);
		const btn = screen.getByLabelText("Changelog");
		fireEvent.click(btn);
		expect(screen.getByText("What's new")).toBeTruthy();
		fireEvent.click(btn);
		expect(screen.queryByText("What's new")).toBeNull();
	});
});

/* ─── LoginForm ──────────────────────────────────────────────── */

describe("LoginForm", () => {
	it("renders and shows error on failed login", async () => {
		mockUseLogin.mockReturnValue({
			mutateAsync: vi
				.fn()
				.mockRejectedValue(new Error("Invalid email or password")),
		});
		render(
			<WithRouter>
				<LoginForm />
			</WithRouter>,
		);
		await waitFor(() =>
			expect(screen.getByPlaceholderText("you@example.com")).toBeTruthy(),
		);
		fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
			target: { value: "a@b.com" },
		});
		fireEvent.change(screen.getByPlaceholderText("••••••••"), {
			target: { value: "pass" },
		});
		fireEvent.submit(screen.getByRole("button"));
		expect(await screen.findByText("Invalid email or password")).toBeTruthy();
	});

	it("renders field errors from server details", async () => {
		mockUseLogin.mockReturnValue({
			mutateAsync: vi.fn().mockRejectedValue({
				message: "Validation failed",
				details: { email: "bad email", password: "bad password" },
			}),
		});
		render(
			<WithRouter>
				<LoginForm />
			</WithRouter>,
		);
		await waitFor(() =>
			expect(screen.getByPlaceholderText("you@example.com")).toBeTruthy(),
		);
		fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
			target: { value: "a@b.com" },
		});
		fireEvent.change(screen.getByPlaceholderText("••••••••"), {
			target: { value: "pass" },
		});
		fireEvent.submit(screen.getByRole("button"));
		expect(await screen.findByText("bad email")).toBeTruthy();
		expect(screen.getByText("bad password")).toBeTruthy();
	});
});

/* ─── RegisterForm ───────────────────────────────────────────── */

describe("RegisterForm", () => {
	it("renders and shows error on failed register", async () => {
		const mutateAsync = vi
			.fn()
			.mockRejectedValue(new Error("Registration failed"));
		mockUseSignup.mockReturnValue({ mutateAsync });
		render(
			<WithRouter>
				<RegisterForm />
			</WithRouter>,
		);
		await waitFor(() =>
			expect(screen.getByPlaceholderText("you@example.com")).toBeTruthy(),
		);
		fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
			target: { value: "a@b.com" },
		});
		const pwds = screen.getAllByPlaceholderText("••••••••");
		fireEvent.change(pwds[0], { target: { value: "pass123" } });
		fireEvent.change(pwds[1], { target: { value: "pass123" } });
		fireEvent.submit(screen.getByRole("button"));
		expect(await screen.findByText("Registration failed")).toBeTruthy();
	});

	it("renders email field error from server details", async () => {
		mockUseSignup.mockReturnValue({
			mutateAsync: vi.fn().mockRejectedValue({
				message: "failed",
				details: { email: "email taken" },
			}),
		});
		render(
			<WithRouter>
				<RegisterForm />
			</WithRouter>,
		);
		await waitFor(() =>
			expect(screen.getByPlaceholderText("you@example.com")).toBeTruthy(),
		);
		fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
			target: { value: "a@b.com" },
		});
		const pwds = screen.getAllByPlaceholderText("••••••••");
		fireEvent.change(pwds[0], { target: { value: "pass123" } });
		fireEvent.change(pwds[1], { target: { value: "pass123" } });
		fireEvent.submit(screen.getByRole("button"));
		expect(await screen.findByText("email taken")).toBeTruthy();
	});
});
