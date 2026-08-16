// packages/ui/__tests__/interior2.test.ts
// Smoke tests for the interior.dev components fetched from the authoritative
// interior.dev registry (https://www.interior.dev/r/<slug>.json).
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useFloatingLabel } from "../src/components/interior/floating-label-input";
import { useHoldToConfirm } from "../src/components/interior/hold-to-confirm";
import { useInlineValidation } from "../src/components/interior/inline-validation";
import { useOtpInput } from "../src/components/interior/otp-input";
import { useTabs } from "../src/components/interior/tabs";

describe("interior.dev registry components (fetched source)", () => {
	it("useInlineValidation reports status + message", () => {
		const { result } = renderHook(() =>
			useInlineValidation({
				value: "x",
				validate: (v: string) => (v.length > 3 ? null : "too short"),
			}),
		);
		expect(typeof result.current.status).toBe("string");
		expect(typeof result.current.message).toBe("string");
	});

	it("useFloatingLabel raises when there is a value", () => {
		const { result } = renderHook(() =>
			useFloatingLabel({ value: "hello", defaultValue: "" }),
		);
		expect(result.current.raised).toBe(true);
	});

	it("useHoldToConfirm exposes a bind + phase", () => {
		const { result } = renderHook(() =>
			useHoldToConfirm({ onConfirm: () => {}, duration: 100 }),
		);
		expect(result.current.phase).toBe("idle");
		expect(typeof result.current.bind.onPointerDown).toBe("function");
	});

	it("useOtpInput exposes chars sized by length and completion flag", () => {
		const { result } = renderHook(() =>
			useOtpInput({ length: 4, onChange: () => {} }),
		);
		expect(result.current.chars).toHaveLength(4);
		expect(result.current.complete).toBe(false);
	});

	it("useTabs tracks active value", () => {
		const { result } = renderHook(() =>
			useTabs({
				items: [
					{ value: "a", label: "A" },
					{ value: "b", label: "B" },
				],
				defaultValue: "a",
			}),
		);
		expect(result.current.value).toBe("a");
		act(() => result.current.select("b"));
		expect(result.current.value).toBe("b");
	});
});
