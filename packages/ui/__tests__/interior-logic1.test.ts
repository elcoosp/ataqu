import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { paginate, usePagination } from "../src/components/interior/pagination";
import { useWizard } from "../src/components/interior/wizard-steps";
import { useTabs } from "../src/components/interior/tabs";
import { usePasswordStrength } from "../src/components/interior/password-strength";
import { usePollResults } from "../src/components/interior/poll-results";
import { useStreamingText } from "../src/components/interior/streaming-text";
import { useValueFlash } from "../src/components/interior/value-flash";
import { useIconMorph } from "../src/components/interior/icon-morph";
import { useTextReveal } from "../src/components/interior/text-reveal";
import { useReadingProgress } from "../src/components/interior/reading-progress";
import { useTypingPresence } from "../src/components/interior/typing-indicator";
import { usePresence } from "../src/components/interior/presence-avatars";
import { useLiveActivity } from "../src/components/interior/live-activity";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// paginate (pure function)
// ---------------------------------------------------------------------------
describe("paginate (pure function)", () => {
  it("nearStart: page=1 yields [1,2,3,4,5,'gap-r',20]", () => {
    expect(paginate(1, 20, 1, 1)).toEqual([1, 2, 3, 4, 5, "gap-r", 20]);
  });

  it("nearEnd: page=18 yields [1,'gap-l',16,17,18,19,20]", () => {
    expect(paginate(18, 20, 1, 1)).toEqual([1, "gap-l", 16, 17, 18, 19, 20]);
  });

  it("middle: page=10 yields [1,'gap-l',9,10,11,'gap-r',20]", () => {
    expect(paginate(10, 20, 1, 1)).toEqual([1, "gap-l", 9, 10, 11, "gap-r", 20]);
  });

  it("small count: count<=total returns range(1,count)", () => {
    const total = 2 * 1 + 2 * 1 + 3;
    expect(paginate(1, 5, 1, 1)).toEqual([1, 2, 3, 4, 5]);
    expect(paginate(1, total, 1, 1)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(paginate(1, 1, 1, 1)).toEqual([1]);
    expect(paginate(1, 0, 1, 1)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// usePagination
// ---------------------------------------------------------------------------
describe("usePagination", () => {
  it("navigates with next/prev/goTo", () => {
    const { result } = renderHook(() =>
      usePagination({ count: 10, defaultPage: 1 }),
    );
    expect(result.current.page).toBe(1);
    expect(result.current.canPrev).toBe(false);
    expect(result.current.canNext).toBe(true);

    act(() => result.current.next());
    expect(result.current.page).toBe(2);
    expect(result.current.canPrev).toBe(true);

    act(() => result.current.goTo(5));
    expect(result.current.page).toBe(5);

    act(() => result.current.prev());
    expect(result.current.page).toBe(4);
  });

  it("clamps out-of-range goTo", () => {
    const { result } = renderHook(() =>
      usePagination({ count: 5, defaultPage: 3 }),
    );
    act(() => result.current.goTo(100));
    expect(result.current.page).toBe(5);

    act(() => result.current.goTo(-50));
    expect(result.current.page).toBe(1);
  });

  it("controlled mode with onPageChange", () => {
    const onPageChange = vi.fn();
    const { result, rerender } = renderHook(
      ({ page }) =>
        usePagination({ count: 10, page, onPageChange }),
      { initialProps: { page: 1 } },
    );
    expect(result.current.page).toBe(1);

    act(() => result.current.next());
    expect(onPageChange).toHaveBeenCalledWith(2);
    expect(result.current.page).toBe(1);

    rerender({ page: 2 });
    expect(result.current.page).toBe(2);
  });

  it("same-page goTo is a no-op (no onPageChange call)", () => {
    const onPageChange = vi.fn();
    const { result } = renderHook(() =>
      usePagination({ count: 10, defaultPage: 3, onPageChange }),
    );
    act(() => result.current.goTo(3));
    expect(onPageChange).not.toHaveBeenCalled();
    expect(result.current.page).toBe(3);
  });

  it("generates correct items array and thumbIndex", () => {
    const { result } = renderHook(() =>
      usePagination({ count: 20, defaultPage: 10, siblings: 1, boundaries: 1 }),
    );
    expect(result.current.items).toEqual([1, "gap-l", 9, 10, 11, "gap-r", 20]);
    expect(result.current.thumbIndex).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// useWizard
// ---------------------------------------------------------------------------
describe("useWizard", () => {
  it("next/back/goTo navigation", () => {
    const { result } = renderHook(() => useWizard({ total: 4, defaultIndex: 0 }));
    expect(result.current.index).toBe(0);
    expect(result.current.isFirst).toBe(true);
    expect(result.current.isLast).toBe(false);

    act(() => result.current.next());
    expect(result.current.index).toBe(1);

    act(() => result.current.next());
    expect(result.current.index).toBe(2);

    act(() => result.current.back());
    expect(result.current.index).toBe(1);

    act(() => result.current.goTo(3));
    expect(result.current.index).toBe(3);
    expect(result.current.isLast).toBe(true);
  });

  it("first/last boundaries prevent overshoot", () => {
    const { result } = renderHook(() => useWizard({ total: 3, defaultIndex: 0 }));
    expect(result.current.isFirst).toBe(true);
    act(() => result.current.back());
    expect(result.current.index).toBe(0);

    act(() => result.current.next());
    act(() => result.current.next());
    expect(result.current.isLast).toBe(true);
    act(() => result.current.next());
    expect(result.current.index).toBe(2);
  });

  it("furthest tracks the highest visited index", () => {
    const { result } = renderHook(() => useWizard({ total: 5, defaultIndex: 0 }));
    expect(result.current.furthest).toBe(0);

    act(() => result.current.next());
    act(() => result.current.next());
    expect(result.current.furthest).toBe(2);

    act(() => result.current.back());
    expect(result.current.furthest).toBe(2);

    act(() => result.current.goTo(4));
    expect(result.current.furthest).toBe(4);
  });

  it("controlled index with onIndexChange", () => {
    const onIndexChange = vi.fn();
    const { result, rerender } = renderHook(
      ({ index }) =>
        useWizard({ total: 3, index, onIndexChange }),
      { initialProps: { index: 0 } },
    );
    act(() => result.current.next());
    expect(onIndexChange).toHaveBeenCalledWith(1, 1);
    expect(result.current.index).toBe(0);

    rerender({ index: 1 });
    expect(result.current.index).toBe(1);
  });

  it("onComplete fires on final next", () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useWizard({ total: 3, defaultIndex: 0, onComplete }),
    );
    act(() => result.current.next());
    act(() => result.current.next());
    expect(result.current.isLast).toBe(true);
    act(() => result.current.next());
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(result.current.index).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// useTabs
// ---------------------------------------------------------------------------
describe("useTabs", () => {
  const items = [
    { value: "a", label: "A" },
    { value: "b", label: "B" },
    { value: "c", label: "C" },
  ];

  it("initial value and select", () => {
    const { result } = renderHook(() =>
      useTabs({ items, defaultValue: "a" }),
    );
    expect(result.current.value).toBe("a");

    act(() => result.current.select("b"));
    expect(result.current.value).toBe("b");

    act(() => result.current.select("c"));
    expect(result.current.value).toBe("c");
  });

  it("direction on forward/back navigation", () => {
    const { result } = renderHook(() =>
      useTabs({ items, defaultValue: "a" }),
    );
    act(() => result.current.select("b"));
    expect(result.current.direction).toBe(1);

    act(() => result.current.select("a"));
    expect(result.current.direction).toBe(-1);
  });

  it("controlled mode with onValueChange", () => {
    const onValueChange = vi.fn();
    const { result, rerender } = renderHook(
      ({ value }) =>
        useTabs({ items, value, onValueChange }),
      { initialProps: { value: "a" as string } },
    );
    act(() => result.current.select("b"));
    expect(onValueChange).toHaveBeenCalledWith("b");
    expect(result.current.value).toBe("a");

    rerender({ value: "b" });
    expect(result.current.value).toBe("b");
  });

  it("select same value is a no-op", () => {
    const onValueChange = vi.fn();
    const { result } = renderHook(() =>
      useTabs({ items, defaultValue: "a", onValueChange }),
    );
    act(() => result.current.select("a"));
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("manual activation: arrow key does not auto-select", () => {
    const { result } = renderHook(() =>
      useTabs({ items, defaultValue: "a", activation: "manual" }),
    );
    const props = result.current.getTabProps(items[0], 0);
    act(() => {
      props.onKeyDown({
        key: "ArrowRight",
        preventDefault: vi.fn(),
      } as any);
    });
    expect(result.current.value).toBe("a");

    const { result: result2 } = renderHook(() =>
      useTabs({ items, defaultValue: "a", activation: "automatic" }),
    );
    const props2 = result2.current.getTabProps(items[0], 0);
    act(() => {
      props2.onKeyDown({
        key: "ArrowRight",
        preventDefault: vi.fn(),
      } as any);
    });
    expect(result2.current.value).toBe("b");
  });
});

// ---------------------------------------------------------------------------
// usePasswordStrength
// ---------------------------------------------------------------------------
describe("usePasswordStrength", () => {
  it("empty password → score 0, label Empty", () => {
    const { result } = renderHook(() => usePasswordStrength(""));
    expect(result.current.score).toBe(0);
    expect(result.current.max).toBe(4);
    expect(result.current.label).toBe("Empty");
    expect(result.current.rules.every((r) => !r.met)).toBe(true);
  });

  it("weak/common password → score 1, guessable", () => {
    const { result } = renderHook(() => usePasswordStrength("password"));
    expect(result.current.score).toBe(1);
    expect(result.current.guessable).toBe(true);
    expect(result.current.label).toBe("Weak");
  });

  it("strong password → full score with all rules met", () => {
    const { result } = renderHook(() =>
      usePasswordStrength("MyS3cur3P@ss!"),
    );
    expect(result.current.score).toBe(4);
    expect(result.current.guessable).toBe(false);
    expect(result.current.label).toBe("Strong");
    expect(result.current.rules.every((r) => r.met)).toBe(true);
  });

  it("announcement settles after announceDelay", () => {
    const { result } = renderHook(() =>
      usePasswordStrength("abc", { announceDelay: 500 }),
    );
    expect(result.current.announcement).toBe("");
    act(() => vi.advanceTimersByTime(500));
    expect(result.current.announcement).not.toBe("");
  });
});

// ---------------------------------------------------------------------------
// usePollResults
// ---------------------------------------------------------------------------
describe("usePollResults", () => {
  const options = [
    { id: "a", label: "Option A", votes: 10 },
    { id: "b", label: "Option B", votes: 5 },
  ];

  it("vote sets chosen and computes shares", () => {
    const { result } = renderHook(() =>
      usePollResults({ options }),
    );
    expect(result.current.chosen).toBeNull();
    expect(result.current.revealed).toBe(false);

    act(() => result.current.vote("a"));
    expect(result.current.chosen).toBe("a");
    expect(result.current.revealed).toBe(true);
    expect(result.current.total).toBe(15);

    const rowA = result.current.rows.find((r) => r.id === "a")!;
    expect(rowA.mine).toBe(true);
    expect(rowA.share).toBeCloseTo(10 / 15);
    expect(rowA.winner).toBe(true);

    const rowB = result.current.rows.find((r) => r.id === "b")!;
    expect(rowB.mine).toBe(false);
    expect(rowB.share).toBeCloseTo(5 / 15);
  });

  it("double vote is a no-op", () => {
    const onVote = vi.fn();
    const { result } = renderHook(() =>
      usePollResults({ options, onVote }),
    );
    act(() => result.current.vote("a"));
    expect(onVote).toHaveBeenCalledTimes(1);
    act(() => result.current.vote("b"));
    expect(onVote).toHaveBeenCalledTimes(1);
  });

  it("controlled value", () => {
    const { result, rerender } = renderHook(
      ({ value }) => usePollResults({ options, value }),
      { initialProps: { value: "a" as string | null } },
    );
    expect(result.current.chosen).toBe("a");
    expect(result.current.revealed).toBe(true);

    rerender({ value: null });
    expect(result.current.chosen).toBeNull();
    expect(result.current.revealed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// useStreamingText
// ---------------------------------------------------------------------------
describe("useStreamingText", () => {
  it("autoStart:false → idle, index 0", () => {
    const { result } = renderHook(() =>
      useStreamingText({ text: "hello", autoStart: false }),
    );
    expect(result.current.status).toBe("idle");
    expect(result.current.index).toBe(0);
    expect(result.current.visible).toBe("");
  });

  it("start/pause transitions", () => {
    const { result } = renderHook(() =>
      useStreamingText({ text: "hello", autoStart: false }),
    );
    act(() => result.current.start());
    expect(result.current.status).toBe("streaming");

    act(() => result.current.pause());
    expect(result.current.status).toBe("paused");

    act(() => result.current.start());
    expect(result.current.status).toBe("streaming");
  });

  it("skip completes immediately with full text", () => {
    const onDone = vi.fn();
    const { result } = renderHook(() =>
      useStreamingText({ text: "hello", autoStart: false, onDone }),
    );
    act(() => result.current.skip());
    expect(result.current.status).toBe("done");
    expect(result.current.index).toBe(5);
    expect(result.current.visible).toBe("hello");
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("reset returns to initial state", () => {
    const { result } = renderHook(() =>
      useStreamingText({ text: "hello", autoStart: false }),
    );
    act(() => result.current.skip());
    expect(result.current.status).toBe("done");

    act(() => result.current.reset());
    expect(result.current.status).toBe("idle");
    expect(result.current.index).toBe(0);
    expect(result.current.visible).toBe("");
  });

  it("onDone fires when streaming completes via skip", () => {
    const onDone = vi.fn();
    const { result } = renderHook(() =>
      useStreamingText({ text: "abc", autoStart: true, onDone }),
    );
    expect(result.current.status).toBe("streaming");
    act(() => result.current.skip());
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(result.current.visible).toBe("abc");
  });
});

// ---------------------------------------------------------------------------
// useValueFlash
// ---------------------------------------------------------------------------
describe("useValueFlash", () => {
  it("value change sets direction and flashing", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useValueFlash(value),
      { initialProps: { value: 10 } },
    );
    expect(result.current.flashing).toBe(false);
    expect(result.current.direction).toBeNull();

    rerender({ value: 20 });
    expect(result.current.direction).toBe("up");
    expect(result.current.flashing).toBe(true);
    expect(result.current.from).toBe(10);
    expect(result.current.changeId).toBe(1);
  });

  it("down direction on decreasing value", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useValueFlash(value),
      { initialProps: { value: 20 } },
    );
    rerender({ value: 10 });
    expect(result.current.direction).toBe("down");
    expect(result.current.flashing).toBe(true);
  });

  it("hold timer clears flashing", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useValueFlash(value, { hold: 500 }),
      { initialProps: { value: 10 } },
    );
    rerender({ value: 20 });
    expect(result.current.flashing).toBe(true);

    act(() => vi.advanceTimersByTime(500));
    expect(result.current.flashing).toBe(false);
  });

  it("same value is a no-op", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useValueFlash(value),
      { initialProps: { value: 10 } },
    );
    rerender({ value: 10 });
    expect(result.current.flashing).toBe(false);
    expect(result.current.changeId).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// useIconMorph
// ---------------------------------------------------------------------------
describe("useIconMorph", () => {
  it("default preset state (menu-close)", () => {
    const { result } = renderHook(() => useIconMorph());
    expect(result.current.index).toBe(0);
    expect(result.current.count).toBe(2);
    expect(result.current.mode).toBe("stroke");
    expect(result.current.label).toBe("Menu");
    expect(result.current.labels).toEqual(["Menu", "Close"]);
  });

  it("toggle wraps around", () => {
    const { result } = renderHook(() => useIconMorph());
    act(() => result.current.toggle());
    expect(result.current.index).toBe(1);
    expect(result.current.label).toBe("Close");

    act(() => result.current.toggle());
    expect(result.current.index).toBe(0);
    expect(result.current.label).toBe("Menu");
  });

  it("setIndex sets specific state", () => {
    const { result } = renderHook(() => useIconMorph());
    act(() => result.current.setIndex(1));
    expect(result.current.index).toBe(1);

    act(() => result.current.setIndex(0));
    expect(result.current.index).toBe(0);
  });

  it("play-pause preset mode is fill", () => {
    const { result } = renderHook(() =>
      useIconMorph({ preset: "play-pause" }),
    );
    expect(result.current.mode).toBe("fill");
    expect(result.current.labels).toEqual(["Play", "Pause"]);
    expect(result.current.label).toBe("Play");
  });

  it("onActiveChange fires on toggle", () => {
    const onActiveChange = vi.fn();
    const { result } = renderHook(() =>
      useIconMorph({ onActiveChange }),
    );
    act(() => result.current.toggle());
    expect(onActiveChange).toHaveBeenCalledWith(1);
  });
});

// ---------------------------------------------------------------------------
// useTextReveal
// ---------------------------------------------------------------------------
describe("useTextReveal", () => {
  it("word split produces one group per word", () => {
    const { result } = renderHook(() =>
      useTextReveal({ text: "hello world", by: "word", startOnView: false }),
    );
    expect(result.current.groups).toHaveLength(2);
    expect(result.current.count).toBe(2);
    expect(result.current.groups[0].units).toHaveLength(1);
    expect(result.current.groups[0].units[0].text).toBe("hello");
  });

  it("character split produces one unit per char per word", () => {
    const { result } = renderHook(() =>
      useTextReveal({ text: "hi go", by: "character", startOnView: false }),
    );
    expect(result.current.groups).toHaveLength(2);
    expect(result.current.count).toBe(4);
    expect(result.current.groups[0].units).toHaveLength(2);
    expect(result.current.groups[0].units[0].text).toBe("h");
    expect(result.current.groups[1].units).toHaveLength(2);
  });

  it("step and started are computed correctly", () => {
    const { result } = renderHook(() =>
      useTextReveal({
        text: "a b c",
        by: "word",
        stagger: 0.1,
        startOnView: false,
        play: true,
      }),
    );
    expect(result.current.count).toBe(3);
    expect(result.current.step).toBeGreaterThan(0);
    expect(result.current.started).toBe(true);

    const { result: result2 } = renderHook(() =>
      useTextReveal({ text: "a b c", play: false, startOnView: false }),
    );
    expect(result2.current.started).toBe(false);
  });

  it("single word has step 0", () => {
    const { result } = renderHook(() =>
      useTextReveal({ text: "hello", startOnView: false }),
    );
    expect(result.current.count).toBe(1);
    expect(result.current.step).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// useReadingProgress
// ---------------------------------------------------------------------------
describe("useReadingProgress", () => {
  beforeEach(() => {
    Object.defineProperty(document.documentElement, "scrollHeight", {
      value: 2000,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, "innerHeight", {
      value: 500,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, "scrollY", {
      value: 0,
      writable: true,
      configurable: true,
    });
  });

  it("initial progress from DOM at top", () => {
    const { result } = renderHook(() => useReadingProgress({ steps: 24 }));
    expect(result.current.step).toBe(0);
    expect(result.current.progress).toBe(0);
    expect(result.current.percent).toBe(0);
    expect(result.current.complete).toBe(false);
  });

  it("minutesLeft and totalMinutes with words", () => {
    const { result } = renderHook(() =>
      useReadingProgress({ steps: 24, words: 1000, wordsPerMinute: 200 }),
    );
    expect(result.current.totalMinutes).toBe(5);
    expect(result.current.minutesLeft).toBe(5);
  });

  it("scroll updates progress toward 100", () => {
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) =>
      setTimeout(() => cb(performance.now()), 0) as unknown as number,
    );
    vi.stubGlobal("cancelAnimationFrame", (id: number) =>
      clearTimeout(id as unknown as ReturnType<typeof setTimeout>),
    );

    const { result } = renderHook(() => useReadingProgress({ steps: 24 }));
    expect(result.current.progress).toBe(0);

    Object.defineProperty(window, "scrollY", {
      value: 750,
      writable: true,
      configurable: true,
    });
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });
    act(() => vi.advanceTimersByTime(10));

    expect(result.current.progress).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// useTypingPresence
// ---------------------------------------------------------------------------
describe("useTypingPresence", () => {
  it("ping shows typist and increments beat", () => {
    const { result } = renderHook(() => useTypingPresence());
    expect(result.current.typists).toEqual([]);
    expect(result.current.beat).toBe(0);

    act(() => result.current.ping("Alice"));
    expect(result.current.typists).toContain("Alice");
    expect(result.current.beat).toBe(1);
  });

  it("clear removes specific typist", () => {
    const { result } = renderHook(() => useTypingPresence());
    act(() => result.current.ping("Alice"));
    act(() => result.current.ping("Bob"));
    expect(result.current.typists).toHaveLength(2);

    act(() => result.current.clear("Alice"));
    expect(result.current.typists).not.toContain("Alice");
    expect(result.current.typists).toContain("Bob");
  });

  it("timeout expiry removes typists", () => {
    const { result } = renderHook(() =>
      useTypingPresence({ timeout: 1000, minVisible: 200 }),
    );
    act(() => result.current.ping("Alice"));
    expect(result.current.typists).toContain("Alice");

    act(() => vi.advanceTimersByTime(1500));
    expect(result.current.typists).toEqual([]);
    expect(result.current.beat).toBe(0);
  });

  it("send sets sending then clears after release timeout", () => {
    const { result } = renderHook(() => useTypingPresence());
    act(() => result.current.ping("Alice"));
    act(() => result.current.send("Alice"));
    expect(result.current.sending).toBe(true);

    act(() => vi.advanceTimersByTime(400));
    expect(result.current.sending).toBe(false);
    expect(result.current.typists).toEqual([]);
  });

  it("reset clears everything immediately", () => {
    const { result } = renderHook(() => useTypingPresence());
    act(() => result.current.ping("Alice"));
    act(() => result.current.ping("Bob"));
    expect(result.current.typists).toHaveLength(2);

    act(() => result.current.reset());
    expect(result.current.typists).toEqual([]);
    expect(result.current.beat).toBe(0);
    expect(result.current.sending).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// usePresence
// ---------------------------------------------------------------------------
describe("usePresence", () => {
  const makePeople = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `Person ${i}` }));

  it("visible/hidden split by max", () => {
    const { result } = renderHook(() =>
      usePresence({ people: makePeople(5), max: 2 }),
    );
    expect(result.current.visible).toHaveLength(2);
    expect(result.current.hidden).toHaveLength(3);
    expect(result.current.overflow).toBe(3);
    expect(result.current.total).toBe(5);
  });

  it("summary text", () => {
    const { result } = renderHook(() =>
      usePresence({ people: makePeople(3), max: 5 }),
    );
    expect(result.current.summary).toBe("Person 0, Person 1 and 1 other are here");
  });

  it("announceAfter timer updates announcement", () => {
    const { result, rerender } = renderHook(
      ({ people }) => usePresence({ people, max: 5, announceAfter: 500 }),
      { initialProps: { people: makePeople(2) } },
    );
    expect(result.current.announcement).toBe("Person 0 and Person 1 are here");

    rerender({ people: makePeople(4) });
    expect(result.current.announcement).toBe("Person 0 and Person 1 are here");

    act(() => vi.advanceTimersByTime(500));
    expect(result.current.announcement).toBe(
      "Person 0, Person 1 and 2 others are here",
    );
  });
});

// ---------------------------------------------------------------------------
// useLiveActivity
// ---------------------------------------------------------------------------
describe("useLiveActivity", () => {
  it("start creates running activity", () => {
    const { result } = renderHook(() => useLiveActivity());
    expect(result.current.activity).toBeNull();

    let id = "";
    act(() => {
      id = result.current.start({ title: "Deploying" });
    });
    expect(id).toMatch(/^activity-/);
    expect(result.current.activity).not.toBeNull();
    expect(result.current.activity!.phase).toBe("running");
    expect(result.current.activity!.title).toBe("Deploying");
  });

  it("update patches activity fields", () => {
    const { result } = renderHook(() => useLiveActivity());
    act(() => result.current.start({ title: "Deploying" }));
    act(() => result.current.update({ detail: "Step 2/3", progress: 0.5 }));
    expect(result.current.activity!.detail).toBe("Step 2/3");
    expect(result.current.activity!.progress).toBe(0.5);
  });

  it("succeed auto-dismisses after linger", () => {
    const { result } = renderHook(() => useLiveActivity({ linger: 500 }));
    act(() => result.current.start({ title: "Deploying" }));
    act(() => result.current.succeed());
    expect(result.current.activity!.phase).toBe("success");

    act(() => vi.advanceTimersByTime(499));
    expect(result.current.activity).not.toBeNull();

    act(() => vi.advanceTimersByTime(1));
    expect(result.current.activity).toBeNull();
  });

  it("fail persists until explicit dismiss", () => {
    const { result } = renderHook(() => useLiveActivity());
    act(() => result.current.start({ title: "Deploying" }));
    act(() => result.current.fail({ detail: "Error" }));
    expect(result.current.activity!.phase).toBe("error");

    act(() => vi.advanceTimersByTime(10000));
    expect(result.current.activity).not.toBeNull();

    act(() => result.current.dismiss());
    expect(result.current.activity).toBeNull();
  });

  it("dismiss clears immediately", () => {
    const { result } = renderHook(() => useLiveActivity());
    act(() => result.current.start({ title: "Uploading" }));
    expect(result.current.activity).not.toBeNull();

    act(() => result.current.dismiss());
    expect(result.current.activity).toBeNull();
  });

  it("multiple starts overwrite the previous activity", () => {
    const { result } = renderHook(() => useLiveActivity());
    act(() => result.current.start({ title: "First" }));
    const firstId = result.current.activity!.id;

    act(() => result.current.start({ title: "Second" }));
    expect(result.current.activity!.title).toBe("Second");
    expect(result.current.activity!.id).not.toBe(firstId);
  });
});
