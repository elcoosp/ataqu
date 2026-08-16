import { useOnboardingStore } from "@ataqu/shared-stores";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useClickOutside } from "../src/use-click-outside";
import { useDebounce } from "../src/use-debounce";
import { useHotkeys } from "../src/use-hotkeys";
import { useIdempotency } from "../src/use-idempotency";
import { useLocalStorage } from "../src/use-local-storage";
import { useOnboard } from "../src/use-onboard";
import { useOptimistic } from "../src/use-optimistic";
import { useSSE } from "../src/use-sse";
import { useWebSocket } from "../src/use-web-socket";

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

describe("useOptimistic", () => {
	it("tracks loading and success", async () => {
		const { result } = renderHook(() =>
			useOptimistic(async (n: number) => n * 2, { onSuccess: () => {} }),
		);
		let p: Promise<unknown>;
		act(() => {
			p = result.current.mutate(21);
		});
		expect(result.current.isLoading).toBe(true);
		await act(async () => {
			await p;
		});
		expect(result.current.isLoading).toBe(false);
		expect(result.current.error).toBeNull();
	});

	it("tracks error on failure", async () => {
		const onError = vi.fn();
		const { result } = renderHook(() =>
			useOptimistic(
				async () => {
					throw new Error("fail");
				},
				{ onError },
			),
		);
		await act(async () => {
			await expect(result.current.mutate(1)).rejects.toThrow("fail");
		});
		expect(result.current.error).toBeInstanceOf(Error);
		expect(onError).toHaveBeenCalled();
	});
});

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
