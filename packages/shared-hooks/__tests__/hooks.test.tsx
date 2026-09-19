import { useOnboardingStore } from "@ataqu/shared-stores";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useClickOutside } from "../src/use-click-outside";
import { useDebounce } from "../src/use-debounce";
import {
	__resetKeyboardEngineForTests,
	useHotkeys,
	useShortcut,
	useShortcutScope,
} from "../src/use-hotkeys";
import { useIdempotency } from "../src/use-idempotency";
import { useLocalStorage } from "../src/use-local-storage";
import { useOnboard } from "../src/use-onboard";
import { useSSE } from "../src/use-sse";
import { useWebSocket } from "../src/use-web-socket";
import {
	eventToToken,
	formatShortcut,
	SHORTCUTS,
} from "../src/shortcuts";

class FakeEventSource {
	static instances: FakeEventSource[] = [];
	url: string;
	onopen: ((e: Event) => void) | null = null;
	onmessage: ((e: MessageEvent) => void) | null = null;
	onerror: ((e: Event) => void) | null = null;
	constructor(url: string) {
		this.url = url;
		FakeEventSource.instances.push(this);
	}
	close() {}
}

class FakeWebSocket {
	static instances: FakeWebSocket[] = [];
	url: string;
	readyState = 0;
	onopen: ((e: Event) => void) | null = null;
	onmessage: ((e: MessageEvent) => void) | null = null;
	onclose: ((e: CloseEvent) => void) | null = null;
	onerror: ((e: Event) => void) | null = null;
	constructor(url: string) {
		this.url = url;
		FakeWebSocket.instances.push(this);
	}
	send(_data: string) {}
	close() {
		this.readyState = 3;
	}
}

beforeEach(() => {
	vi.stubGlobal("EventSource", FakeEventSource as any);
	vi.stubGlobal("WebSocket", FakeWebSocket as any);
	FakeEventSource.instances = [];
	FakeWebSocket.instances = [];
	useOnboardingStore.setState({ completedTours: {} });
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("useDebounce", () => {
	it("debounces value changes", async () => {
		const { result, rerender } = renderHook(
			({ v }: { v: string }) => useDebounce(v, 20),
			{ initialProps: { v: "a" } },
		);
		expect(result.current).toBe("a");
		rerender({ v: "b" });
		expect(result.current).toBe("a");
		await waitFor(() => expect(result.current).toBe("b"));
	});
});

describe("useLocalStorage", () => {
	it("reads initial value", () => {
		const { result } = renderHook(() => useLocalStorage("k1", "def"));
		expect(result.current[0]).toBe("def");
	});

	it("writes and reads back", () => {
		const { result } = renderHook(() => useLocalStorage("k2", 0));
		act(() => result.current[1](5));
		expect(result.current[0]).toBe(5);
		expect(window.localStorage.getItem("k2")).toBe("5");
	});

	it("supports functional updates", () => {
		const { result } = renderHook(() => useLocalStorage("k3", 1));
		act(() => result.current[1]((p) => p + 10));
		expect(result.current[0]).toBe(11);
	});

	it("parses stored JSON on init", () => {
		window.localStorage.setItem("k4", JSON.stringify({ a: 1 }));
		const { result } = renderHook(() => useLocalStorage("k4", null));
		expect(result.current[0]).toEqual({ a: 1 });
	});
});

describe("useClickOutside", () => {
	it("calls handler when clicking outside the ref element", () => {
		const handler = vi.fn();
		const { result } = renderHook(() =>
			useClickOutside<HTMLDivElement>(handler),
		);
		const el = document.createElement("div");
		result.current.current = el;
		const outside = document.createElement("div");
		document.body.appendChild(outside);
		act(() => {
			el.contains = () => false;
			outside.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
		});
		expect(handler).toHaveBeenCalled();
	});

	it("does not call handler when clicking inside", () => {
		const handler = vi.fn();
		const { result } = renderHook(() =>
			useClickOutside<HTMLDivElement>(handler),
		);
		const el = document.createElement("div");
		result.current.current = el;
		act(() => {
			el.contains = () => true;
			el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
		});
		expect(handler).not.toHaveBeenCalled();
	});
});

describe("useHotkeys", () => {
	it("fires on cmd/ctrl + key", () => {
		const cb = vi.fn();
		renderHook(() => useHotkeys("k", cb));
		act(() => {
			document.dispatchEvent(
				new KeyboardEvent("keydown", { key: "k", metaKey: true }),
			);
		});
		expect(cb).toHaveBeenCalled();
	});

	it("ignores unmatched keys", () => {
		const cb = vi.fn();
		renderHook(() => useHotkeys("k", cb));
		act(() => {
			document.dispatchEvent(new KeyboardEvent("keydown", { key: "z" }));
		});
		expect(cb).not.toHaveBeenCalled();
	});
});

describe("useShortcut (keyboard engine)", () => {
	const press = (init: KeyboardEventInit) =>
		act(() => {
			document.dispatchEvent(new KeyboardEvent("keydown", init));
		});

	afterEach(() => {
		cleanup();
		__resetKeyboardEngineForTests();
	});

	it("fires a plain chord", () => {
		const cb = vi.fn();
		renderHook(() => useShortcut("mod+k", cb));
		press({ key: "k", metaKey: true });
		expect(cb).toHaveBeenCalledTimes(1);
	});

	it("supports sequences (g then d)", () => {
		const cb = vi.fn();
		renderHook(() => useShortcut("g d", cb));
		press({ key: "g" });
		press({ key: "d" });
		expect(cb).toHaveBeenCalledTimes(1);
	});

	it("does not fire a sequence when only the prefix is pressed", () => {
		const cb = vi.fn();
		renderHook(() => useShortcut("g d", cb));
		press({ key: "g" });
		expect(cb).not.toHaveBeenCalled();
	});

	it("expires a sequence prefix after the timeout", () => {
		vi.useFakeTimers();
		try {
			const cb = vi.fn();
			renderHook(() => useShortcut("g d", cb));
			press({ key: "g" });
			// Advance past SEQUENCE_TIMEOUT_MS before the second chord.
			act(() => {
				vi.advanceTimersByTime(1000);
			});
			press({ key: "d" });
			expect(cb).not.toHaveBeenCalled();
		} finally {
			vi.useRealTimers();
		}
	});

	it("does not arm a prefix from an unrelated key", () => {
		const cb = vi.fn();
		renderHook(() => useShortcut("g d", cb));
		press({ key: "x" });
		press({ key: "d" });
		expect(cb).not.toHaveBeenCalled();
	});

	it("does not fire a sequence prefix that is also a standalone binding", () => {
		const standalone = vi.fn();
		const sequence = vi.fn();
		renderHook(() => useShortcut(["g d", "g"], () => standalone()));
		press({ key: "g" });
		expect(standalone).toHaveBeenCalledTimes(1);
		press({ key: "d" });
		expect(sequence).not.toHaveBeenCalled();
	});

	it("guards bare letters while typing in an input", () => {
		const cb = vi.fn();
		renderHook(() => useShortcut("j", cb));
		const input = document.createElement("input");
		document.body.appendChild(input);
		// Bubbles: true so the event actually reaches the document listener
		// with `event.target` pointing at the input — otherwise this passes
		// vacuously (event never observed) and proves nothing.
		act(() => {
			input.dispatchEvent(
				new KeyboardEvent("keydown", { key: "j", bubbles: true }),
			);
		});
		expect(cb).not.toHaveBeenCalled();
	});

	it("allows modifier chords while typing in an input", () => {
		const cb = vi.fn();
		renderHook(() => useShortcut("mod+k", cb));
		const input = document.createElement("input");
		document.body.appendChild(input);
		act(() => {
			input.dispatchEvent(
				new KeyboardEvent("keydown", {
					key: "k",
					metaKey: true,
					bubbles: true,
				}),
			);
		});
		expect(cb).toHaveBeenCalledTimes(1);
	});

	it("blocks sequences while typing but allows them once focus leaves", () => {
		const cb = vi.fn();
		renderHook(() => useShortcut("g d", cb));
		const input = document.createElement("input");
		document.body.appendChild(input);
		act(() => {
			input.dispatchEvent(
				new KeyboardEvent("keydown", { key: "g", bubbles: true }),
			);
			input.dispatchEvent(
				new KeyboardEvent("keydown", { key: "d", bubbles: true }),
			);
		});
		expect(cb).not.toHaveBeenCalled();
		// Away from the text field the same chord sequence completes.
		act(() => {
			document.dispatchEvent(new KeyboardEvent("keydown", { key: "g" }));
			document.dispatchEvent(new KeyboardEvent("keydown", { key: "d" }));
		});
		expect(cb).toHaveBeenCalledTimes(1);
	});

	it("respects scope: list bindings need an active list scope", () => {
		const cb = vi.fn();
		renderHook(() => useShortcut("j", cb, { scope: "list" }));
		press({ key: "j" });
		expect(cb).not.toHaveBeenCalled();
	});

	it("fires scoped bindings once the scope is activated", () => {
		const cb = vi.fn();
		renderHook(() => useShortcutScope("list"));
		renderHook(() => useShortcut("j", cb, { scope: "list" }));
		press({ key: "j" });
		expect(cb).toHaveBeenCalledTimes(1);
	});

	it("honours enabled: false", () => {
		const cb = vi.fn();
		renderHook(() => useShortcut("j", cb, { enabled: false }));
		press({ key: "j" });
		expect(cb).not.toHaveBeenCalled();
	});

	it("unregisters on unmount so a stale binding cannot fire", () => {
		const cb = vi.fn();
		const { unmount } = renderHook(() => useShortcut("j", cb));
		unmount();
		press({ key: "j" });
		expect(cb).not.toHaveBeenCalled();
	});
});

describe("shortcuts registry helpers", () => {
	it("maps events to canonical tokens", () => {
		expect(
			eventToToken(
				new KeyboardEvent("keydown", { key: "k", metaKey: true }),
			),
		).toBe("mod+k");
		expect(eventToToken(new KeyboardEvent("keydown", { key: "Shift" }))).toBe(
			null,
		);
		expect(eventToToken(new KeyboardEvent("keydown", { key: " " }))).toBe(
			"space",
		);
	});

	it("normalizes shift+/ into ?", () => {
		expect(
			eventToToken(
				new KeyboardEvent("keydown", { key: "?", shiftKey: true }),
			),
		).toBe("?");
	});

	it("formats chords per platform vocabulary", () => {
		// jsdom reports a non-Apple platform → Ctrl vocabulary.
		expect(formatShortcut("mod+k")).toBe("Ctrl+K");
		expect(formatShortcut("g d")).toBe("G D");
		expect(formatShortcut("mod+enter")).toBe("Ctrl+⏎");
		expect(formatShortcut("escape")).toBe("Esc");
	});

	it("keeps the help overlay and the dispatcher in sync", () => {
		expect(SHORTCUTS.length).toBeGreaterThan(0);
		for (const def of SHORTCUTS) {
			expect(def.keys.length).toBeGreaterThan(0);
			expect(def.label.length).toBeGreaterThan(0);
		}
	});
});

// The former `useOptimistic` loading-wrapper tests moved to
// `__tests__/use-optimistic.test.tsx`, which covers the rewritten
// `useOptimisticMutation` kit (optimistic paint, rollback, ConflictError).

describe("useIdempotency", () => {
	it("returns a stable key until reset", () => {
		const { result } = renderHook(() => useIdempotency());
		const first = result.current.getKey();
		expect(result.current.getKey()).toBe(first);
		act(() => result.current.resetKey());
		expect(result.current.getKey()).not.toBe(first);
	});
});

describe("useOnboard", () => {
	it("is active when tour not completed", () => {
		const { result } = renderHook(() => useOnboard("tour-x"));
		expect(result.current.isActive).toBe(true);
	});

	it("completes and deactivates", () => {
		const { result } = renderHook(() => useOnboard("tour-x"));
		act(() => result.current.complete());
		expect(result.current.isActive).toBe(false);
		expect(useOnboardingStore.getState().isCompleted("tour-x")).toBe(true);
	});

	it("skip deactivates without completing", () => {
		const { result } = renderHook(() => useOnboard("tour-y"));
		act(() => result.current.skip());
		expect(result.current.isActive).toBe(false);
		expect(useOnboardingStore.getState().isCompleted("tour-y")).toBe(false);
	});
});

describe("useSSE", () => {
	it("connects and parses messages", async () => {
		const onMessage = vi.fn();
		const { result } = renderHook(() =>
			useSSE("http://x/stream", { onMessage }),
		);
		await waitFor(() => expect(FakeEventSource.instances.length).toBe(1));
		const es = FakeEventSource.instances[0];
		act(() => es.onopen?.(new Event("open") as any));
		expect(result.current.isConnected).toBe(true);
		act(() =>
			es.onmessage?.(
				new MessageEvent("message", { data: JSON.stringify({ v: 1 }) }),
			),
		);
		expect(result.current.data).toEqual({ v: 1 });
		expect(onMessage).toHaveBeenCalledWith({ v: 1 });
	});

	it("does nothing when url is null", () => {
		renderHook(() => useSSE(null));
		expect(FakeEventSource.instances.length).toBe(0);
	});

	it("handles non-JSON messages", () => {
		const onMessage = vi.fn();
		const { result } = renderHook(() => useSSE("http://x/s", { onMessage }));
		const es = FakeEventSource.instances[0];
		act(() => es.onmessage?.(new MessageEvent("message", { data: "plain" })));
		expect(result.current.data).toBe("plain");
	});
});

describe("useWebSocket", () => {
	it("connects and parses messages", async () => {
		const onMessage = vi.fn();
		const { result } = renderHook(() => useWebSocket("ws://x", { onMessage }));
		await waitFor(() => expect(FakeWebSocket.instances.length).toBe(1));
		const ws = FakeWebSocket.instances[0];
		act(() => ws.onopen?.(new Event("open") as any));
		expect(result.current.isConnected).toBe(true);
		act(() =>
			ws.onmessage?.(
				new MessageEvent("message", { data: JSON.stringify({ a: 1 }) }),
			),
		);
		expect(result.current.lastMessage).toEqual({ a: 1 });
	});

	it("sends only when open", () => {
		const { result } = renderHook(() => useWebSocket("ws://x"));
		const ws = FakeWebSocket.instances[0];
		act(() => ws.onopen?.(new Event("open") as any));
		expect(result.current.isConnected).toBe(true);
		ws.readyState = 1; // OPEN
		act(() => result.current.sendMessage({ hi: 1 }));
		expect(result.current.isConnected).toBe(true);
	});
});
