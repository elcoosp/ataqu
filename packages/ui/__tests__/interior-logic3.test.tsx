import { act, fireEvent, render, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useBlurUpImage } from "../src/components/interior/blur-up-image";
import { useHideOnScroll } from "../src/components/interior/hide-on-scroll";
import { useHoldToConfirm } from "../src/components/interior/hold-to-confirm";
import { useLoadMore } from "../src/components/interior/load-more";
import { useLogoMarquee } from "../src/components/interior/logo-marquee";
import { useLongPress } from "../src/components/interior/long-press";
import { useNewItems } from "../src/components/interior/new-items-pill";
import { usePressDepth } from "../src/components/interior/press-depth";
import { useReorderList } from "../src/components/interior/reorder-list";
import { useRipple } from "../src/components/interior/ripple";
import { useScrollSpy } from "../src/components/interior/scroll-spy";
import { useSkeletonSwap } from "../src/components/interior/skeleton-swap";
import { useSliderDetents } from "../src/components/interior/slider-detents";
import { useSnapCarousel } from "../src/components/interior/snap-carousel";
import { useSortableRows } from "../src/components/interior/sortable-table";
import { useCondense } from "../src/components/interior/sticky-header";
import { useSwipeDeck } from "../src/components/interior/swipe-deck";
import { useTreeView } from "../src/components/interior/tree-view";

beforeEach(() => {
	vi.useFakeTimers();
	document.body.innerHTML = "";
});

afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	document.body.innerHTML = "";
});

// ---------------------------------------------------------------------------
// useRipple
// ---------------------------------------------------------------------------
describe("useRipple", () => {
	const rectEl = () =>
		({
			getBoundingClientRect: () => ({
				left: 0,
				top: 0,
				width: 100,
				height: 80,
				right: 100,
				bottom: 80,
			}),
			setPointerCapture: vi.fn(),
		}) as unknown as HTMLElement;

	it("spawns on pointer down and releases on pointer up", () => {
		const { result } = renderHook(() => useRipple({}));
		expect(result.current.ripples).toEqual([]);

		act(() =>
			result.current.bind.onPointerDown({
				pointerType: "mouse",
				button: 0,
				pointerId: 1,
				clientX: 25,
				clientY: 20,
				currentTarget: rectEl(),
			} as unknown as React.PointerEvent),
		);
		expect(result.current.ripples).toHaveLength(1);

		act(() =>
			result.current.bind.onPointerUp({
				pointerId: 1,
			} as unknown as React.PointerEvent),
		);
		act(() => vi.advanceTimersByTime(700));
		expect(result.current.ripples).toEqual([]);
	});

	it("spawns via keyboard and releases on key up", () => {
		const { result } = renderHook(() => useRipple({ minVisible: 0, fade: 0 }));
		act(() =>
			result.current.bind.onKeyDown({
				key: "Enter",
				currentTarget: rectEl(),
			} as unknown as React.KeyboardEvent),
		);
		expect(result.current.ripples).toHaveLength(1);

		act(() =>
			result.current.bind.onKeyUp({
				key: "Enter",
			} as unknown as React.KeyboardEvent),
		);
		act(() => vi.advanceTimersByTime(200));
		expect(result.current.ripples).toEqual([]);
	});

	it("ignores non-primary buttons, repeat keys and duplicate pointers", () => {
		const { result } = renderHook(() => useRipple({}));

		act(() =>
			result.current.bind.onPointerDown({
				pointerType: "mouse",
				button: 2,
				pointerId: 1,
				clientX: 10,
				currentTarget: rectEl(),
			} as unknown as React.PointerEvent),
		);
		expect(result.current.ripples).toHaveLength(0);

		act(() =>
			result.current.bind.onKeyDown({
				key: "Enter",
				repeat: true,
			} as unknown as React.KeyboardEvent),
		);
		expect(result.current.ripples).toHaveLength(0);
	});

	it("releases all on blur and respects disabled", () => {
		const { result } = renderHook(() =>
			useRipple({ disabled: true, minVisible: 0 }),
		);
		act(() =>
			result.current.bind.onPointerDown({
				pointerType: "mouse",
				button: 0,
				pointerId: 2,
				clientX: 10,
				currentTarget: rectEl(),
			} as unknown as React.PointerEvent),
		);
		expect(result.current.ripples).toHaveLength(0);

		const busy = renderHook(() => useRipple({ minVisible: 0, fade: 0 }));
		act(() =>
			busy.result.current.bind.onPointerDown({
				pointerType: "mouse",
				button: 0,
				pointerId: 3,
				clientX: 10,
				currentTarget: rectEl(),
			} as unknown as React.PointerEvent),
		);
		expect(busy.result.current.ripples).toHaveLength(1);
		act(() =>
			busy.result.current.bind.onLostPointerCapture({
				pointerId: 3,
			} as unknown as React.PointerEvent),
		);
		act(() => busy.result.current.bind.onBlur());
		act(() => vi.advanceTimersByTime(200));
		expect(busy.result.current.ripples).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// useLongPress
// ---------------------------------------------------------------------------
describe("useLongPress", () => {
	const evDown = () =>
		({
			button: 0,
			pointerType: "mouse",
			clientX: 10,
			clientY: 10,
			currentTarget: { setPointerCapture: vi.fn() },
		}) as unknown as React.PointerEvent;

	it("fires onLongPress after hold", () => {
		const onLongPress = vi.fn();
		const { result } = renderHook(() =>
			useLongPress({ onLongPress, duration: 500 }),
		);

		act(() => result.current.bind.onPointerDown(evDown()));
		expect(result.current.holding).toBe(true);
		act(() => vi.advanceTimersByTime(600));
		expect(onLongPress).toHaveBeenCalled();
		act(() => vi.advanceTimersByTime(300));
		expect(result.current.holding).toBe(false);
	});

	it("cancels when moving too far or releasing early", () => {
		const onCancel = vi.fn();
		const onLongPress = vi.fn();
		const { result } = renderHook(() =>
			useLongPress({ onLongPress, onCancel, duration: 500, moveTolerance: 8 }),
		);

		act(() => result.current.bind.onPointerDown(evDown()));
		act(() =>
			result.current.bind.onPointerMove({
				clientX: 60,
				clientY: 60,
			} as unknown as React.PointerEvent),
		);
		expect(onCancel).toHaveBeenCalled();
		act(() => vi.advanceTimersByTime(600));
		expect(onLongPress).not.toHaveBeenCalled();

		act(() => result.current.bind.onPointerDown(evDown()));
		act(() => result.current.bind.onPointerUp({} as React.PointerEvent));
		act(() => vi.advanceTimersByTime(600));
		expect(onLongPress).not.toHaveBeenCalled();
	});

	it("supports keyboard start and ignores repeated keys", () => {
		const onLongPress = vi.fn();
		const { result } = renderHook(() =>
			useLongPress({ onLongPress, duration: 500 }),
		);
		act(() => result.current.bind.onKeyDown(ev(" ")));
		act(() =>
			result.current.bind.onKeyDown({
				...ev(" "),
				repeat: true,
			}),
		);
		act(() => vi.advanceTimersByTime(600));
		expect(onLongPress).toHaveBeenCalledTimes(1);
	});

	it("respects disabled", () => {
		const onLongPress = vi.fn();
		const { result } = renderHook(() =>
			useLongPress({ onLongPress, duration: 500, disabled: true }),
		);
		act(() => result.current.bind.onPointerDown(evDown()));
		act(() => vi.advanceTimersByTime(600));
		expect(onLongPress).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// useHoldToConfirm
// ---------------------------------------------------------------------------
describe("useHoldToConfirm", () => {
	it("confirms after holding", () => {
		const onConfirm = vi.fn();
		const { result } = renderHook(() =>
			useHoldToConfirm({
				onConfirm,
				duration: 320,
				steps: 10,
				haptic: false,
			}),
		);

		act(() =>
			result.current.bind.onPointerDown({
				pointerType: "mouse",
				button: 0,
				pointerId: 1,
				clientX: 10,
				clientY: 10,
				currentTarget: { setPointerCapture: vi.fn() },
			} as unknown as React.PointerEvent),
		);
		act(() => vi.advanceTimersByTime(700));
		expect(onConfirm).toHaveBeenCalled();

		const ev = {
			preventDefault: () => undefined,
			stopPropagation: vi.fn(),
		} as unknown as React.MouseEvent;
		act(() => result.current.bind.onClick(ev));
		expect(ev.stopPropagation).toHaveBeenCalled();
	});

	it("aborts when released early or moved too far", () => {
		const onAbort = vi.fn();
		const onConfirm = vi.fn();
		const { result } = renderHook(() =>
			useHoldToConfirm({
				onConfirm,
				onAbort,
				duration: 320,
				haptic: false,
				moveTolerance: 8,
			}),
		);

		act(() =>
			result.current.bind.onPointerDown({
				pointerType: "mouse",
				button: 0,
				pointerId: 2,
				clientX: 10,
				clientY: 10,
				currentTarget: { setPointerCapture: vi.fn() },
			} as unknown as React.PointerEvent),
		);
		act(() => vi.advanceTimersByTime(100));
		act(() =>
			result.current.bind.onPointerMove({
				clientX: 40,
				clientY: 10,
			} as unknown as React.PointerEvent),
		);
		expect(onAbort).toHaveBeenCalledTimes(1);
		act(() => vi.advanceTimersByTime(400));
		expect(onConfirm).not.toHaveBeenCalled();

		act(() => result.current.bind.onKeyDown(ev(" ")));
		act(() => vi.advanceTimersByTime(100));
		act(() => result.current.bind.onKeyUp({ key: " " } as React.KeyboardEvent));
		expect(onAbort).toHaveBeenCalledTimes(2);
		act(() => vi.advanceTimersByTime(400));
		expect(onConfirm).not.toHaveBeenCalled();
	});

	it("escape cancels a hold", () => {
		const onConfirm = vi.fn();
		const { result } = renderHook(() =>
			useHoldToConfirm({ onConfirm, duration: 320, haptic: false }),
		);
		act(() => result.current.bind.onKeyDown(ev(" ")));
		act(() => result.current.bind.onKeyDown(ev("Escape")));
		act(() => vi.advanceTimersByTime(700));
		expect(onConfirm).not.toHaveBeenCalled();
	});

	it("ignores repeat keys and non-primary mouse buttons", () => {
		const onConfirm = vi.fn();
		const { result } = renderHook(() =>
			useHoldToConfirm({ onConfirm, duration: 320, haptic: false }),
		);
		act(() =>
			result.current.bind.onPointerDown({
				pointerType: "mouse",
				button: 2,
				clientX: 10,
				currentTarget: { setPointerCapture: vi.fn() },
			} as unknown as React.PointerEvent),
		);
		act(() => vi.advanceTimersByTime(700));
		expect(onConfirm).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// useHideOnScroll
// ---------------------------------------------------------------------------
describe("useHideOnScroll", () => {
	const mountRig = (opts: Parameters<typeof useHideOnScroll>[0]) => {
		let api: ReturnType<typeof useHideOnScroll> | null = null;
		function Rig() {
			api = useHideOnScroll(opts);
			return <div ref={api.ref} style={{ height: 100, overflow: "auto" }} />;
		}
		const { container } = render(<Rig />);
		const el = container.querySelector("div");
		return { api: () => api, el: el as HTMLDivElement };
	};

	it("hides scrolling down and reveals scrolling up", () => {
		const { api, el } = mountRig({ hideAfter: 14, revealAfter: 10 });

		Object.defineProperty(el, "scrollHeight", {
			value: 2000,
			configurable: true,
		});
		Object.defineProperty(el, "clientHeight", {
			value: 1000,
			configurable: true,
		});

		el.scrollTop = 200;
		act(() => {
			el.dispatchEvent(new Event("scroll"));
			vi.advanceTimersByTime(20);
		});
		expect(api()?.hidden).toBe(true);

		el.scrollTop = 50;
		act(() => {
			el.dispatchEvent(new Event("scroll"));
			vi.advanceTimersByTime(20);
		});
		expect(api()?.hidden).toBe(false);
	});

	it("stays hidden at top guard and honors pinned", () => {
		const { api, el } = mountRig({ pinned: true });
		Object.defineProperty(el, "scrollHeight", {
			value: 2000,
			configurable: true,
		});
		Object.defineProperty(el, "clientHeight", {
			value: 1000,
			configurable: true,
		});

		el.scrollTop = 300;
		act(() => {
			el.dispatchEvent(new Event("scroll"));
			vi.advanceTimersByTime(20);
		});
		expect(api()?.hidden).toBe(false);
		expect(api()?.atTop).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// useScrollSpy
// ---------------------------------------------------------------------------
describe("useScrollSpy", () => {
	const sections = [
		{ id: "overview", label: "Overview" },
		{ id: "details", label: "Details" },
	];

	beforeEach(() => {
		const a = document.createElement("section");
		a.id = "overview";
		const b = document.createElement("section");
		b.id = "details";
		document.body.append(a, b);
	});

	it("initializes active section and emits onChange", () => {
		const onChange = vi.fn();
		const { result } = renderHook(() => useScrollSpy({ sections, onChange }));
		expect(result.current.activeId).toBe("overview");
		expect(onChange).toHaveBeenCalledWith("overview");
	});

	it("scrolls to a section and links reflect active", () => {
		const { result } = renderHook(() => useScrollSpy({ sections }));

		act(() => result.current.scrollTo("details"));
		expect(result.current.activeId).toBe("details");
		expect(result.current.activeIndex).toBe(1);
		expect(result.current.getLinkProps("details")["aria-current"]).toBe(
			"location",
		);
		expect(
			result.current.getLinkProps("overview")["aria-current"],
		).toBeUndefined();
		expect(result.current.getLinkProps("details").href).toBe("#details");

		const ev = {
			preventDefault: vi.fn(),
			button: 0,
			shiftKey: false,
			metaKey: false,
			ctrlKey: false,
		} as unknown as React.MouseEvent<HTMLAnchorElement>;
		act(() => result.current.getLinkProps("overview").onClick(ev));
		expect(ev.preventDefault).toHaveBeenCalled();
		expect(result.current.activeId).toBe("overview");
	});

	it("skips modifier-clicks and announces after settle", () => {
		const { result } = renderHook(() => useScrollSpy({ sections }));
		const ev = {
			preventDefault: vi.fn(),
			button: 0,
			metaKey: true,
			shiftKey: false,
			ctrlKey: false,
		} as unknown as React.MouseEvent<HTMLAnchorElement>;
		result.current.getLinkProps("overview").onClick(ev);
		expect(ev.preventDefault).not.toHaveBeenCalled();

		act(() => result.current.scrollTo("details"));
		act(() => vi.advanceTimersByTime(500));
		expect(result.current.announce).toBe("Details");
	});
});

// ---------------------------------------------------------------------------
// useLoadMore
// ---------------------------------------------------------------------------
describe("useLoadMore", () => {
	function stubObserver() {
		const instances: Array<{
			cb: IntersectionObserverCallback;
			observe: ReturnType<typeof vi.fn>;
			unobserve: ReturnType<typeof vi.fn>;
			disconnect: ReturnType<typeof vi.fn>;
		}> = [];
		class IO {
			cb: IntersectionObserverCallback;
			observe = vi.fn();
			unobserve = vi.fn();
			disconnect = vi.fn();
			constructor(cb: IntersectionObserverCallback) {
				this.cb = cb;
				instances.push(this);
			}
		}
		vi.stubGlobal("IntersectionObserver", IO);
		return instances;
	}

	it("auto-loads via observer and settles idle", async () => {
		const instances = stubObserver();
		const onLoad = vi.fn().mockResolvedValue(undefined);
		let api: { status: string } | null = null;
		function Rig() {
			const more = useLoadMore({ onLoad, rootMargin: "0px" });
			api = { status: more.status };
			return <div ref={more.sentinelRef as never} />;
		}
		render(<Rig />);
		expect(instances).toHaveLength(1);
		expect(instances[0].observe).toHaveBeenCalled();

		await act(async () => {
			instances[0].cb(
				[{ isIntersecting: true } as IntersectionObserverEntry],
				instances[0] as unknown as IntersectionObserver,
			);
		});
		expect(onLoad).toHaveBeenCalledTimes(1);
		expect(api?.status).toBe("idle");
	});

	it("manual load() runs and ends when onLoad returns false", async () => {
		const onLoad = vi.fn().mockResolvedValue(false);
		let api: { status: string; load: () => void } | null = null;
		function Rig() {
			const more = useLoadMore({ onLoad, auto: false });
			api = { status: more.status, load: more.load };
			return <div ref={more.sentinelRef as never} />;
		}
		render(<Rig />);
		await act(async () => api?.load());
		expect(onLoad).toHaveBeenCalledTimes(1);
		expect(api?.status).toBe("end");
	});

	it("reports error, pauses via maxAutoLoads and calls onError", async () => {
		const onError = vi.fn();
		const onLoad = vi.fn().mockResolvedValue(undefined);
		let api: { status: string; load: () => void; paused: boolean } | null =
			null;
		function Rig() {
			const more = useLoadMore({ onLoad, auto: false, maxAutoLoads: 1 });
			api = { status: more.status, load: more.load, paused: more.paused };
			return <div ref={more.sentinelRef as never} />;
		}
		render(<Rig />);

		{
			let errApi: { status: string; load: () => void } | null = null;
			function BadRig() {
				const more = useLoadMore({
					onLoad: () => Promise.reject(new Error("boom")),
					auto: false,
					onError,
				});
				errApi = { status: more.status, load: more.load };
				return <div ref={more.sentinelRef as never} />;
			}
			render(<BadRig />);
			await act(async () => errApi?.load());
			expect(onError).toHaveBeenCalled();
			expect(errApi?.status).toBe("error");
		}

		await act(async () => api?.load());
		expect(onLoad).toHaveBeenCalled();
		expect(api?.paused).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// useSkeletonSwap
// ---------------------------------------------------------------------------
describe("useSkeletonSwap", () => {
	it("appears after delay while not ready and hides when ready", () => {
		const { result, rerender } = renderHook(
			({ ready }: { ready: boolean }) =>
				useSkeletonSwap({ ready, delay: 80, minVisible: 0 }),
			{ initialProps: { ready: false } },
		);
		expect(result.current.showSkeleton).toBe(false);
		act(() => vi.advanceTimersByTime(100));
		expect(result.current.showSkeleton).toBe(true);
		expect(result.current.busy).toBe(true);

		rerender({ ready: true });
		act(() => vi.advanceTimersByTime(100));
		expect(result.current.showSkeleton).toBe(false);
		expect(result.current.busy).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// useNewItems
// ---------------------------------------------------------------------------
describe("useNewItems", () => {
	it("counts unread when unpinned and jump clears them", () => {
		let api: ReturnType<typeof useNewItems> | null = null;
		function Rig({ count }: { count: number }) {
			api = useNewItems({ itemCount: count });
			return (
				<div
					ref={api.scrollProps.ref}
					style={{ height: 100, overflow: "auto" }}
				/>
			);
		}
		const { rerender } = render(<Rig count={5} />);
		const el = api?.scrollProps.ref.current as HTMLDivElement;

		Object.defineProperty(el, "scrollHeight", {
			value: 2000,
			configurable: true,
		});
		Object.defineProperty(el, "clientHeight", {
			value: 400,
			configurable: true,
		});

		el.scrollTop = 600;
		act(() => el.dispatchEvent(new Event("scroll")));
		expect(api?.pinned).toBe(false);

		rerender(<Rig count={6} />);
		expect(api?.unread).toBeGreaterThan(0);

		el.scrollTop = 0;
		act(() => el.dispatchEvent(new Event("scroll")));
		expect(api?.unread).toBe(0);
		expect(api?.pinned).toBe(true);

		let caught = -1;
		act(() => {
			caught = api?.jump() ?? -1;
		});
		expect(caught).toBe(0);
	});

	it("bottom anchor pins at bottom", () => {
		let api: ReturnType<typeof useNewItems> | null = null;
		function Rig() {
			api = useNewItems({ itemCount: 3, anchor: "bottom" });
			return (
				<div
					ref={api.scrollProps.ref}
					style={{ height: 100, overflow: "auto" }}
				/>
			);
		}
		const { container } = render(<Rig />);
		const el = container.querySelector("div") as HTMLDivElement;
		Object.defineProperty(el, "scrollHeight", {
			value: 2000,
			configurable: true,
		});
		Object.defineProperty(el, "clientHeight", {
			value: 400,
			configurable: true,
		});
		expect(api?.pinned).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// useReorderList
// ---------------------------------------------------------------------------
describe("useReorderList", () => {
	const items = [
		{ id: "a", name: "Alpha" },
		{ id: "b", name: "Beta" },
		{ id: "c", name: "Gamma" },
	];
	const getId = (i: { id: string }) => i.id;
	const getLabel = (i: { name: string }) => i.name;

	it("grabs, steps and drops with keyboard", () => {
		const onReorder = vi.fn();
		const onCommit = vi.fn();
		const { result } = renderHook(() =>
			useReorderList({ items, getId, getLabel, onReorder, onCommit }),
		);

		act(() =>
			result.current.rowKeyDown("a")({
				key: "Enter",
				target: "self",
				currentTarget: "self",
				preventDefault: () => undefined,
			} as unknown as React.KeyboardEvent),
		);
		expect(result.current.grabbed).toBe("a");

		act(() =>
			result.current.rowKeyDown("a")({
				key: "ArrowDown",
				target: "self",
				currentTarget: "self",
				preventDefault: () => undefined,
			} as unknown as React.KeyboardEvent),
		);
		expect(onReorder).toHaveBeenCalled();
		expect(result.current.spoken).toContain("position");

		act(() =>
			result.current.rowKeyDown("a")({
				key: "Enter",
				target: "self",
				currentTarget: "self",
				preventDefault: () => undefined,
			} as unknown as React.KeyboardEvent),
		);
		expect(result.current.grabbed).toBeNull();
		expect(onCommit).toHaveBeenCalled();
	});

	it("cancels and restores original order", () => {
		const onReorder = vi.fn();
		const { result } = renderHook(() =>
			useReorderList({ items, getId, getLabel, onReorder }),
		);
		act(() => result.current.grab("b"));
		act(() => result.current.step("b", -1));
		expect(onReorder).toHaveBeenCalledTimes(1);
		act(() => result.current.cancel());
		expect(onReorder).toHaveBeenCalledTimes(2);
		expect(result.current.grabbed).toBeNull();
	});

	it("boundaries clamp and drag events commit", () => {
		const onCommit = vi.fn();
		const { result } = renderHook(() =>
			useReorderList({ items, getId, getLabel, onReorder: vi.fn(), onCommit }),
		);
		act(() => result.current.step("a", -1));
		expect(onCommit).not.toHaveBeenCalled();

		act(() => result.current.onDragStart("b"));
		expect(result.current.dragging).toBe("b");
		act(() => result.current.onDragEnd("b"));
		expect(onCommit).toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// useSortableRows
// ---------------------------------------------------------------------------
describe("useSortableRows", () => {
	const rows = [
		{ id: "r1", score: 3, name: "Charlie" },
		{ id: "r2", score: 9, name: "Alpha" },
		{ id: "r3", score: 6, name: "Brovo" },
	];
	const getRowId = (r: (typeof rows)[number]) => r.id;
	const getValue = (r: (typeof rows)[number], c: string) =>
		c === "score" ? r.score : r.name;

	it("sorts ascending then descending then restores", () => {
		const onSortChange = vi.fn();
		const { result } = renderHook(() =>
			useSortableRows({ rows, getRowId, getValue, onSortChange }),
		);

		act(() => result.current.toggle("score"));
		expect(result.current.sort).toEqual({
			columnId: "score",
			direction: "asc",
		});
		expect(result.current.ordered[0].row.score).toBe(3);
		expect(result.current.ariaSort("score")).toBe("ascending");

		act(() => result.current.toggle("score"));
		expect(result.current.sort?.direction).toBe("desc");
		expect(result.current.ordered[0].row.score).toBe(9);
		expect(result.current.ariaSort("score")).toBe("descending");

		act(() => result.current.toggle("score"));
		expect(result.current.sort).toBeNull();
		expect(result.current.ariaSort("score")).toBe("none");
		expect(onSortChange).toHaveBeenCalledTimes(3);
	});

	it("respects controlled sort and empty values", () => {
		const onSortChange = vi.fn();
		const mixed = [
			{ id: "x", score: null },
			{ id: "y", score: 5 },
			{ id: "z", score: null },
		];
		const { result } = renderHook(() =>
			useSortableRows({
				rows: mixed,
				getRowId: (r) => r.id,
				getValue: (r) => r.score,
				sort: { columnId: "score", direction: "asc" },
				onSortChange,
			}),
		);
		expect(result.current.ordered[0].id).toBe("y");
		expect(result.current.ordered[1].id).toBe("x");
		expect(result.current.ordered[2].id).toBe("z");

		act(() => result.current.toggle("name"));
		expect(onSortChange).toHaveBeenCalledWith({
			columnId: "name",
			direction: "asc",
		});
	});
});

// ---------------------------------------------------------------------------
// useTreeView
// ---------------------------------------------------------------------------
describe("useTreeView", () => {
	const nodes = [
		{ id: "a", label: "A" },
		{
			id: "b",
			label: "B",
			children: [
				{ id: "b1", label: "B1" },
				{ id: "b2", label: "B2" },
			],
		},
		{ id: "c", label: "C" },
	];

	it("expands, collapses, selects and toggles", () => {
		const onExpandedChange = vi.fn();
		const onSelectedChange = vi.fn();
		const { result } = renderHook(() =>
			useTreeView({ nodes, onExpandedChange, onSelectedChange }),
		);
		expect(result.current.tabStop).toBe("a");

		act(() => result.current.toggle("b"));
		expect(result.current.openSet.has("b")).toBe(true);
		expect(onExpandedChange).toHaveBeenCalledWith(["b"]);

		act(() => result.current.toggle("b"));
		expect(result.current.openSet.has("b")).toBe(false);

		act(() => result.current.select("c"));
		expect(onSelectedChange).toHaveBeenCalledWith("c");
		expect(result.current.selectedId).toBe("c");
	});

	it("navigates rows with keys", () => {
		const { result } = renderHook(() =>
			useTreeView({ nodes, defaultExpanded: ["b"] }),
		);
		const rows = result.current.rows;

		act(() => result.current.handleKey(ev("ArrowDown"), rows[0]));
		expect(result.current.tabStop).toBe("b");
		act(() => result.current.handleKey(ev("ArrowDown"), rows[1]));
		act(() => result.current.handleKey(ev("ArrowRight"), rows[1]));
		expect(result.current.tabStop).toBe("b1");
		act(() => result.current.handleKey(ev("ArrowLeft"), rows[2]));
		expect(result.current.tabStop).toBe("b");
		act(() => result.current.handleKey(ev("ArrowLeft"), rows[1]));
		act(() => result.current.handleKey(ev("Home"), rows[0]));
		expect(result.current.tabStop).toBe("a");
		act(() => result.current.handleKey(ev("End"), rows[0]));
		expect(result.current.tabStop).toBe("c");
		act(() => result.current.handleKey(ev(" "), rows[0]));
		expect(result.current.selectedId).toBe("a");
	});
});

// ---------------------------------------------------------------------------
// useSnapCarousel
// ---------------------------------------------------------------------------
describe("useSnapCarousel", () => {
	it("moves next/prev with bounce at ends and reports index", () => {
		const onIndexChange = vi.fn();
		const { result } = renderHook(() =>
			useSnapCarousel({ count: 5, defaultIndex: 1, onIndexChange }),
		);

		act(() => result.current.next());
		expect(onIndexChange).toHaveBeenLastCalledWith(2);
		act(() => result.current.prev());
		expect(onIndexChange).toHaveBeenLastCalledWith(1);
		act(() => result.current.prev());
		expect(result.current.index).toBe(0);

		const before = onIndexChange.mock.calls.length;
		act(() => result.current.prev());
		expect(onIndexChange.mock.calls.length).toBe(before);
		expect(result.current.index).toBe(0);
		expect(result.current.target).toBe(0);
		expect(result.current.shown).toBe(0);
	});

	it("goTo clamps and drag end picks", () => {
		const { result } = renderHook(() =>
			useSnapCarousel({ count: 5, defaultIndex: 0 }),
		);
		act(() => result.current.goTo(9));
		expect(result.current.target).toBe(4);
		expect(result.current.index).toBe(4);

		act(() => result.current.trackProps.onDragStart());
		act(() =>
			result.current.trackProps.onDrag({} as PointerEvent, {
				offset: { x: 0, y: 0 },
				velocity: { x: 500, y: 0 },
			}),
		);
		act(() =>
			result.current.trackProps.onDragEnd({} as PointerEvent, {
				offset: { x: 0, y: 0 },
				velocity: { x: -100, y: 0 },
			}),
		);
	});
});

// ---------------------------------------------------------------------------
// useSwipeDeck
// ---------------------------------------------------------------------------
describe("useSwipeDeck", () => {
	it("decides right/left, done state, undo and report", () => {
		const onDecide = vi.fn();
		const onUndo = vi.fn();
		const { result } = renderHook(() =>
			useSwipeDeck({ count: 2, onDecide, onUndo }),
		);

		act(() => result.current.decide("right"));
		expect(result.current.index).toBe(1);
		expect(onDecide).toHaveBeenCalledWith(0, "right");
		expect(result.current.canUndo).toBe(true);

		act(() => result.current.report(400));
		expect(result.current.intent.dir).toBe(1);
		expect(result.current.armed).toBe(true);

		act(() => result.current.release(400, 500));
		expect(result.current.index).toBe(2);
		expect(onDecide).toHaveBeenCalledWith(1, "right");
		expect(result.current.done).toBe(true);

		act(() => result.current.undo());
		expect(result.current.index).toBe(1);
		expect(onUndo).toHaveBeenCalledWith(1);

		act(() => result.current.undo());
		act(() => result.current.undo());
		expect(result.current.index).toBe(0);
	});

	it("respects guards, threshold and keyboard", () => {
		const onDecide = vi.fn();
		const { result } = renderHook(() =>
			useSwipeDeck({ count: 1, disabled: true, onDecide }),
		);
		act(() => result.current.decide("left"));
		expect(onDecide).not.toHaveBeenCalled();
		act(() => result.current.undo());
		expect(onDecide).not.toHaveBeenCalled();

		const busy = renderHook(() => useSwipeDeck({ count: 2, onDecide }));
		act(() => busy.result.current.report(5));
		expect(busy.result.current.intent.dir).toBe(0);
		const event = (key: string) =>
			({
				key,
				target: "child",
				currentTarget: "x",
				preventDefault: () => undefined,
			}) as unknown as React.KeyboardEvent;
		act(() => busy.result.current.deckProps.onKeyDown(event("ArrowLeft")));
		expect(onDecide).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// useSliderDetents
// ---------------------------------------------------------------------------
describe("useSliderDetents", () => {
	it("commits via keyboard and snaps to detents", () => {
		const onValueChange = vi.fn();
		const { result } = renderHook(() =>
			useSliderDetents({
				value: 25,
				onValueChange,
				min: 0,
				max: 100,
				detents: [0, 25, 50, 75, 100],
			}),
		);
		expect(result.current.trackProps["aria-valuenow"]).toBe(25);

		const ev = (key: string, extra: Record<string, unknown> = {}) =>
			({
				key,
				preventDefault: () => undefined,
				...extra,
			}) as unknown as React.KeyboardEvent;

		act(() => result.current.trackProps.onKeyDown(ev("ArrowRight")));
		expect(onValueChange).toHaveBeenLastCalledWith(26);
		act(() =>
			result.current.trackProps.onKeyDown(ev("ArrowRight", { shiftKey: true })),
		);
		expect(onValueChange).toHaveBeenLastCalledWith(50);
		act(() => result.current.trackProps.onKeyDown(ev("PageDown")));
		expect(onValueChange).toHaveBeenLastCalledWith(0);
		act(() => result.current.trackProps.onKeyDown(ev("Home")));
		expect(onValueChange).toHaveBeenLastCalledWith(0);
		act(() => result.current.trackProps.onKeyDown(ev("End")));
		expect(onValueChange).toHaveBeenLastCalledWith(100);
	});

	it("captures from pointer and clamps", () => {
		const onValueChange = vi.fn();
		let api: ReturnType<typeof useSliderDetents> | null = null;
		function Rig() {
			api = useSliderDetents({
				value: 10,
				onValueChange,
				min: 0,
				max: 100,
				step: 5,
			});
			return <div ref={api.trackRef} style={{ width: 200 }} />;
		}
		const { container } = render(<Rig />);
		const el = container.querySelector("div") as HTMLDivElement;
		Object.defineProperty(el, "getBoundingClientRect", {
			configurable: true,
			value: () => ({
				left: 0,
				top: 0,
				width: 200,
				height: 20,
				right: 200,
				bottom: 20,
			}),
		});

		act(() =>
			api?.trackProps.onPointerDown({
				pointerType: "mouse",
				button: 0,
				pointerId: 1,
				clientX: 50,
				currentTarget: { setPointerCapture: vi.fn(), focus: vi.fn() },
			} as unknown as React.PointerEvent),
		);
		expect(onValueChange).toHaveBeenCalled();
		expect(api?.dragging).toBe(true);

		act(() => api?.trackProps.onPointerUp({} as React.PointerEvent));
		expect(api?.dragging).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// useBlurUpImage
// ---------------------------------------------------------------------------
describe("useBlurUpImage", () => {
	it("stays loading without an element or src", () => {
		const noSrc = renderHook(() => useBlurUpImage({}));
		expect(noSrc.result.current.status).toBe("loading");

		const noEl = renderHook(() => useBlurUpImage({ src: "x.png" }));
		expect(noEl.result.current.status).toBe("loading");
	});

	it("reveals when the image loads", async () => {
		const onReady = vi.fn();
		let api: ReturnType<typeof useBlurUpImage> | null = null;
		function Rig() {
			api = useBlurUpImage({ src: "img.png", onReady });
			return <img ref={api.ref} src="img.png" alt="" />;
		}
		render(<Rig />);
		const img = document.querySelector("img") as HTMLImageElement;
		(img as unknown as { decode: () => Promise<void> }).decode = vi
			.fn()
			.mockResolvedValue(undefined);
		act(() => img.dispatchEvent(new Event("load")));
		await act(async () => {});
		expect(api?.status).toBe("ready");
		expect(api?.loaded).toBe(true);
		expect(onReady).toHaveBeenCalled();
	});

	it("fails when the image errors", () => {
		const onError = vi.fn();
		let api: ReturnType<typeof useBlurUpImage> | null = null;
		function Rig() {
			api = useBlurUpImage({ src: "bad.png", onError });
			return <img ref={api.ref} src="bad.png" alt="" />;
		}
		render(<Rig />);
		const img = document.querySelector("img") as HTMLImageElement;
		act(() => img.dispatchEvent(new Event("error")));
		expect(api?.status).toBe("error");
		expect(onError).toHaveBeenCalled();
	});

	it("reports a cached image as instant ready", () => {
		const onReady = vi.fn();
		let api: ReturnType<typeof useBlurUpImage> | null = null;
		renderHook(() => {
			api = useBlurUpImage({ src: "cached.png", onReady });
			return null;
		});
		expect(api?.status).toBe("loading");
		expect(api?.instant).toBe(false);
		expect(onReady).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// useCondense
// ---------------------------------------------------------------------------
describe("useCondense", () => {
	it("initializes uncondensed with a progress motion value", () => {
		let api: ReturnType<typeof useCondense<HTMLDivElement>> | null = null;
		function Rig() {
			api = useCondense<HTMLDivElement>({ range: 48 });
			return <div ref={api.ref} />;
		}
		render(<Rig />);
		expect(api?.condensed).toBe(false);
		expect(typeof api?.progress.get).toBe("function");
	});
});

// ---------------------------------------------------------------------------
// useLogoMarquee
// ---------------------------------------------------------------------------
describe("useLogoMarquee", () => {
	it("paints while visible and holds on pointer enter", () => {
		const lastIO: {
			invoke: (e: Partial<IntersectionObserverEntry>) => void;
		} | null = null;
		class IO {
			invoke: (e: Partial<IntersectionObserverEntry>) => void;
			observe = vi.fn();
			unobserve = vi.fn();
			disconnect = vi.fn();
			constructor(callback: IntersectionObserverCallback) {
				this.invoke = (entry: Partial<IntersectionObserverEntry>) =>
					callback([entry as IntersectionObserverEntry], this as never);
			}
		}
		vi.stubGlobal("IntersectionObserver", IO);
		void lastIO;

		let api: ReturnType<typeof useLogoMarquee> | null = null;
		function Rig() {
			api = useLogoMarquee({ speed: 10, direction: "right" });
			return (
				<div ref={api.viewportRef} style={{ width: 300 }}>
					<div ref={api.trackRef}>
						<ul ref={api.groupRef}>
							{Array.from({ length: 3 }).map((_, i) => (
								<li key={i} style={{ display: "inline-block", width: 100 }} />
							))}
						</ul>
					</div>
				</div>
			);
		}
		render(<Rig />);
		const track = document.querySelector(
			"[data-track]",
		) as HTMLDivElement | null;
		void track;

		expect(api?.copies).toBeGreaterThanOrEqual(4);
		expect(api?.reduced).toBe(false);

		act(() =>
			api?.bind.onPointerEnter({ pointerType: "mouse" } as React.PointerEvent),
		);
		act(() => api?.bind.onPointerDown({} as React.PointerEvent));
		expect(api?.paused).toBe(true);
		act(() => api?.bind.onPointerLeave({} as React.PointerEvent));
		act(() => api?.bind.onBlur());
		expect(api?.paused).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// usePressDepth
// ---------------------------------------------------------------------------
describe("usePressDepth", () => {
	it("presses via pointer, keyboard and releases", () => {
		const onPressStart = vi.fn();
		const onPressEnd = vi.fn();
		const { result } = renderHook(() =>
			usePressDepth({ onPressStart, onPressEnd }),
		);
		const node = document.createElement("button");
		Object.defineProperty(node, "getBoundingClientRect", {
			configurable: true,
			value: () => ({
				left: 0,
				top: 0,
				width: 100,
				height: 60,
				right: 100,
				bottom: 60,
			}),
		});
		act(() => result.current.ref(node));

		act(() =>
			result.current.bind.onPointerDown({
				pointerType: "mouse",
				button: 0,
				pointerId: 3,
				clientX: 50,
				clientY: 30,
				currentTarget: node,
			} as unknown as React.PointerEvent),
		);
		expect(result.current.pressed).toBe(true);
		expect(onPressStart).toHaveBeenCalled();
		expect(result.current.origin).not.toBeNull();

		act(() =>
			fireEvent.pointerMove(window, { pointerId: 3, clientX: 60, clientY: 30 }),
		);
		act(() => fireEvent.pointerUp(window, { pointerId: 3 }));
		expect(result.current.pressed).toBe(false);
		expect(onPressEnd).toHaveBeenCalled();
	});

	it("keyboard and escape paths", () => {
		const { result } = renderHook(() => usePressDepth({}));
		act(() =>
			result.current.bind.onKeyDown({
				key: " ",
				repeat: false,
			} as React.KeyboardEvent),
		);
		expect(result.current.pressed).toBe(true);
		act(() =>
			result.current.bind.onKeyUp({ key: "Escape" } as React.KeyboardEvent),
		);
		expect(result.current.pressed).toBe(false);

		act(() =>
			result.current.bind.onKeyDown({
				key: " ",
				repeat: true,
			} as React.KeyboardEvent),
		);
		expect(result.current.pressed).toBe(false);
	});

	it("disabled blocks pointer and key", () => {
		const { result } = renderHook(() => usePressDepth({ disabled: true }));
		act(() =>
			result.current.bind.onPointerDown({
				pointerType: "mouse",
				button: 0,
				pointerId: 1,
				clientX: 0,
				currentTarget: document.createElement("button"),
			} as unknown as React.PointerEvent),
		);
		expect(result.current.pressed).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
function ev(key: string) {
	return { key, preventDefault: () => undefined } as React.KeyboardEvent;
}
