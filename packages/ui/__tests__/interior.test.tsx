// packages/ui/__tests__/interior.test.tsx
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useCopyToClipboard } from "../src/components/interior/copy-button";
import { useFilterGrid } from "../src/components/interior/filter-grid";
import { useAsyncAction } from "../src/components/interior/loading-button";
import { useOtpInput } from "../src/components/interior/otp-input";
import { useShowMore } from "../src/components/interior/show-more";
import { useTagInput } from "../src/components/interior/tag-input";
import { useTaskSteps } from "../src/components/interior/task-steps";

afterEach(() => {
	vi.restoreAllMocks();
});

describe("useAsyncAction (LoadingButton)", () => {
	it("runs, succeeds, and settles to idle", async () => {
		const action = vi.fn().mockResolvedValue("ok");
		const { result } = renderHook(() =>
			useAsyncAction({ action, resetAfter: 50 }),
		);
		expect(result.current.status).toBe("idle");
		act(() => {
			result.current.run();
		});
		expect(result.current.status).toBe("pending");
		await waitFor(() => expect(result.current.status).toBe("success"));
		await waitFor(() => expect(result.current.status).toBe("idle"), {
			timeout: 1500,
		});
		expect(action).toHaveBeenCalledTimes(1);
	});

	it("captures error and resets after timeout", async () => {
		const action = vi.fn().mockRejectedValue(new Error("boom"));
		const { result } = renderHook(() =>
			useAsyncAction({ action, resetAfter: 50 }),
		);
		act(() => {
			result.current.run();
		});
		await waitFor(() => expect(result.current.status).toBe("error"));
		await waitFor(() => expect(result.current.status).toBe("idle"), {
			timeout: 1500,
		});
		expect(action).toHaveBeenCalledTimes(1);
	});
});

describe("useCopyToClipboard (CopyButton)", () => {
	it("writes to the clipboard and reverts", async () => {
		const write = vi.fn().mockResolvedValue(undefined);
		try {
			Object.defineProperty(navigator, "clipboard", {
				configurable: true,
				value: { writeText: write },
			});
		} catch {
			(navigator as any).clipboard = { writeText: write };
		}
		const { result } = renderHook(() =>
			useCopyToClipboard({ value: "abc", timeout: 50 }),
		);
		act(() => {
			result.current.copy();
		});
		await waitFor(() => expect(result.current.copied).toBe(true));
		expect(write).toHaveBeenCalledWith("abc");
		await waitFor(() => expect(result.current.copied).toBe(false), {
			timeout: 1500,
		});
	});
});

describe("useOtpInput", () => {
	it("accumulates chars and fires onComplete at length", () => {
		const onComplete = vi.fn();
		const { result } = renderHook(() => useOtpInput({ length: 4, onComplete }));
		act(() => {
			result.current
				.getCellProps(0)
				.onChange({ target: { value: "1" } } as any);
		});
		act(() => {
			result.current
				.getCellProps(1)
				.onChange({ target: { value: "2" } } as any);
		});
		act(() => {
			result.current
				.getCellProps(2)
				.onChange({ target: { value: "3" } } as any);
		});
		act(() => {
			result.current
				.getCellProps(3)
				.onChange({ target: { value: "4" } } as any);
		});
		expect(result.current.value).toBe("1234");
		expect(result.current.complete).toBe(true);
		expect(onComplete).toHaveBeenCalledWith("1234");
	});
});

describe("useTagInput", () => {
	it("adds and removes tags", () => {
		const onChange = vi.fn();
		const { result } = renderHook(() => useTagInput({ value: [], onChange }));
		act(() => {
			result.current.inputProps.onChange({ target: { value: "alpha" } } as any);
		});
		act(() => {
			result.current.inputProps.onKeyDown({
				key: "Enter",
				preventDefault: () => {},
			} as any);
		});
		expect(onChange).toHaveBeenCalledWith(["alpha"]);
		act(() => {
			result.current.removeAt(0);
		});
		expect(onChange).toHaveBeenLastCalledWith([]);
	});
});

describe("useFilterGrid", () => {
	it("filters items by active filter", () => {
		const items = [
			{ id: "1", kind: "a" },
			{ id: "2", kind: "b" },
			{ id: "3", kind: "a" },
		];
		const filters = [
			{ id: "a", label: "A", match: (i: any) => i.kind === "a" },
		];
		const { result } = renderHook(() =>
			useFilterGrid({ items, filters, getKey: (i) => i.id }),
		);
		expect(result.current.visible.length).toBe(3);
		act(() => {
			result.current.select("a");
		});
		expect(result.current.visible.length).toBe(2);
		expect(result.current.counts.a).toBe(2);
	});
});

describe("useShowMore", () => {
	it("toggles expanded", () => {
		const { result } = renderHook(() => useShowMore({ lines: 3 }));
		expect(result.current.expanded).toBe(false);
		act(() => {
			result.current.setExpanded(true);
		});
		expect(result.current.expanded).toBe(true);
	});
});

describe("useTaskSteps", () => {
	it("reports progress and completion", () => {
		const steps = [
			{ id: "s1", label: "One" },
			{ id: "s2", label: "Two" },
		];
		const { result } = renderHook(() => useTaskSteps({ steps, current: 1 }));
		expect(result.current.rows[0].state).toBe("done");
		expect(result.current.rows[1].state).toBe("active");
		expect(result.current.complete).toBe(false);
		const done = renderHook(() => useTaskSteps({ steps, current: 2 })).result;
		expect(done.current.complete).toBe(true);
	});
});
