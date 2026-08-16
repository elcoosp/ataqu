// packages/ui/__tests__/interior.test.tsx
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	useAsyncAction,
	useCopyToClipboard,
	useValueFlash,
} from "../src/components/interior";

describe("useAsyncAction", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("runs the action and transitions idle -> pending -> success -> idle", async () => {
		const onError = vi.fn();
		const { result } = renderHook(() =>
			useAsyncAction({ action: () => "ok", onError, resetAfter: 50 }),
		);

		expect(result.current.status).toBe("idle");

		act(() => {
			result.current.run();
		});
		expect(result.current.status).toBe("pending");

		await waitFor(() => expect(result.current.status).toBe("success"));
		expect(onError).not.toHaveBeenCalled();

		await waitFor(() => expect(result.current.status).toBe("idle"));
	});

	it("reports error status and calls onError", async () => {
		const onError = vi.fn();
		const { result } = renderHook(() =>
			useAsyncAction({
				action: () => {
					throw new Error("boom");
				},
				onError,
				resetAfter: 50,
			}),
		);

		act(() => {
			result.current.run();
		});
		expect(result.current.status).toBe("pending");

		await waitFor(() => expect(result.current.status).toBe("error"));
		expect(onError).toHaveBeenCalledWith(expect.any(Error));
	});
});

describe("useCopyToClipboard", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("marks copied on success and reverts after timeout", async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(navigator, "clipboard", {
			configurable: true,
			value: { writeText },
		});
		const onCopy = vi.fn();
		const { result } = renderHook(() =>
			useCopyToClipboard({ value: "abc", timeout: 50, onCopy }),
		);

		await act(async () => {
			await result.current.copy();
		});

		expect(result.current.copied).toBe(true);
		expect(writeText).toHaveBeenCalledWith("abc");
		expect(onCopy).toHaveBeenCalledWith("abc");

		await waitFor(() => expect(result.current.copied).toBe(false));
	});
});

describe("useValueFlash", () => {
	it("detects up/down direction and flashes", () => {
		const { result, rerender } = renderHook(
			({ v }) => useValueFlash({ value: v }),
			{
				initialProps: { v: 10 },
			},
		);

		expect(result.current.flashing).toBe(false);

		rerender({ v: 20 });
		expect(result.current.direction).toBe("up");
		expect(result.current.from).toBe(10);
		expect(result.current.flashing).toBe(true);

		rerender({ v: 5 });
		expect(result.current.direction).toBe("down");
		expect(result.current.from).toBe(20);
	});
});
