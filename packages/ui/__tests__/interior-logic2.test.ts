import { act, fireEvent, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useAccordion } from "../src/components/interior/accordion";
import { useCollapsibleBanner } from "../src/components/interior/collapsible-banner";
import { useContextMenu } from "../src/components/interior/context-menu";
import { useDropdown } from "../src/components/interior/dropdown";
import { useExpandingSearch } from "../src/components/interior/expanding-search";
import { useModal } from "../src/components/interior/modal";
import { usePopover } from "../src/components/interior/popover";
import { useTooltip } from "../src/components/interior/tooltip-group";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// useAccordion
// ---------------------------------------------------------------------------
describe("useAccordion", () => {
  const items = [{ id: "a" }, { id: "b" }, { id: "c" }];

  it("toggles single type and exposes aria props", () => {
    const onOpenChange = vi.fn();
    const { result } = renderHook(() =>
      useAccordion({ items, type: "single", onOpenChange }),
    );

    expect(result.current.isOpen("a")).toBe(false);
    expect(result.current.panelProps("a")["aria-hidden"]).toBe(true);

    act(() => result.current.toggle("a"));
    expect(result.current.open).toEqual(["a"]);
    expect(result.current.isOpen("a")).toBe(true);
    expect(onOpenChange).toHaveBeenCalledWith(["a"]);
    expect(result.current.headerProps("a")["aria-expanded"]).toBe(true);
    expect(result.current.panelProps("a")["aria-hidden"]).toBeUndefined();

    act(() => result.current.toggle("b"));
    expect(result.current.open).toEqual(["b"]);
    expect(result.current.headerProps("a")["aria-expanded"]).toBe(false);
  });

  it("supports multiple type and removing", () => {
    const { result } = renderHook(() =>
      useAccordion({ items, type: "multiple", defaultOpen: ["a", "b"] }),
    );
    expect(result.current.open).toEqual(["a", "b"]);

    act(() => result.current.toggle("a"));
    expect(result.current.open).toEqual(["b"]);

    act(() => result.current.toggle("c"));
    expect(result.current.open).toEqual(["b", "c"]);
  });

  it("respects collapsible=false and controlled open", () => {
    const onOpenChange = vi.fn();
    const { result } = renderHook(() =>
      useAccordion({
        items,
        type: "single",
        open: ["a"],
        onOpenChange,
        collapsible: false,
      }),
    );

    act(() => result.current.toggle("a"));
    expect(result.current.open).toEqual(["a"]);
    expect(onOpenChange).not.toHaveBeenCalled();

    act(() => result.current.toggle("b"));
    expect(onOpenChange).toHaveBeenCalledWith(["b"]);
  });

  it("navigates headers with keyboard", () => {
    const { result } = renderHook(() => useAccordion({ items, type: "single" }));

    const focused: string[] = [];
    for (const id of ["a", "b", "c"]) {
      act(() => result.current.headerProps(id).ref(kind({ id, focused })));
    }

    const ev = (key: string) => ({ key, preventDefault: () => undefined }) as React.KeyboardEvent;

    act(() => result.current.headerProps("a").onKeyDown(ev("ArrowDown")));
    expect(focused.at(-1)).toBe("b");
    act(() => result.current.headerProps("b").onKeyDown(ev("ArrowUp")));
    expect(focused.at(-1)).toBe("a");
    act(() => result.current.headerProps("a").onKeyDown(ev("End")));
    expect(focused.at(-1)).toBe("c");
    act(() => result.current.headerProps("c").onKeyDown(ev("Home")));
    expect(focused.at(-1)).toBe("a");
    act(() => result.current.headerProps("a").onKeyDown(ev("ArrowDown")));
    expect(focused.at(-1)).toBe("b");
  });

  it("headerProps onClick toggles the given id", () => {
    const onOpenChange = vi.fn();
    const { result } = renderHook(() =>
      useAccordion({ items, type: "single", onOpenChange }),
    );
    act(() => result.current.headerProps("b").onClick());
    expect(result.current.open).toEqual(["b"]);
    expect(onOpenChange).toHaveBeenCalledWith(["b"]);
  });
});

// ---------------------------------------------------------------------------
// useCollapsibleBanner
// ---------------------------------------------------------------------------
describe("useCollapsibleBanner", () => {
  it("folds, expands, toggles, dismisses and restores", () => {
    const onStateChange = vi.fn();
    const onDismiss = vi.fn();
    const { result } = renderHook(() =>
      useCollapsibleBanner({ onStateChange, onDismiss }),
    );

    expect(result.current.open).toBe(true);
    expect(result.current.folded).toBe(false);

    act(() => result.current.fold());
    expect(result.current.state).toBe("folded");
    expect(result.current.folded).toBe(true);
    expect(onStateChange).toHaveBeenCalledWith("folded");

    act(() => result.current.expand());
    expect(result.current.state).toBe("open");

    act(() => result.current.toggle());
    expect(result.current.state).toBe("folded");

    act(() => result.current.dismiss());
    expect(result.current.dismissed).toBe(true);
    expect(onDismiss).toHaveBeenCalled();

    act(() => result.current.restore());
    expect(result.current.state).toBe("open");
    expect(result.current.open).toBe(true);
  });

  it("respects defaultState and controlled state", () => {
    const onStateChange = vi.fn();
    const { result } = renderHook(() =>
      useCollapsibleBanner({ defaultState: "folded" }),
    );
    expect(result.current.folded).toBe(true);
    expect(result.current.dismissed).toBe(false);

    const { result: controlled } = renderHook(() =>
      useCollapsibleBanner({ state: "dismissed", onStateChange }),
    );
    expect(controlled.current.dismissed).toBe(true);
    act(() => controlled.current.expand());
    expect(onStateChange).toHaveBeenCalledWith("open");
  });
});

// ---------------------------------------------------------------------------
// useDropdown
// ---------------------------------------------------------------------------
describe("useDropdown", () => {
  const items = [
    { value: "a", label: "Alpha" },
    { value: "b", label: "Beta" },
    { value: "c", label: "Gamma", disabled: true },
  ];

  it("opens, selects via onChange and closes", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useDropdown({ items, onChange }));

    act(() => result.current.triggerProps.onClick());
    expect(result.current.triggerProps["aria-expanded"]).toBe(true);

    act(() => result.current.listProps.onKeyDown(ev("Enter")));
    expect(onChange).toHaveBeenCalledWith("a");
    expect(result.current.triggerProps["aria-expanded"]).toBe(false);

    act(() => result.current.triggerProps.onClick());
    act(() => result.current.triggerProps.onClick());
    expect(result.current.triggerProps["aria-expanded"]).toBe(false);
  });

  it("select handles disabled items and uncontrolled value", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useDropdown({ items, onChange }));

    act(() => result.current.listProps.onKeyDown(ev("ArrowDown")));
    act(() => result.current.getItemProps(2).onClick({} as React.MouseEvent));
    expect(onChange).not.toHaveBeenCalled();

    act(() => result.current.getItemProps(0).onClick({} as React.MouseEvent));
    expect(onChange).toHaveBeenCalledWith("a");
    expect(result.current.triggerProps["aria-expanded"]).toBe(false);
  });

  it("supports controlled value, initial selection and keyboard select", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useDropdown({ items, value: "b", onChange }),
    );

    act(() => result.current.triggerProps.onKeyDown(ev("ArrowUp")));
    act(() => result.current.listProps.onKeyDown(ev("End")));
    act(() => result.current.listProps.onKeyDown(ev("Home")));
    act(() => result.current.listProps.onKeyDown(ev("ArrowUp")));
    act(() => result.current.listProps.onKeyDown(ev("Enter")));
    expect(onChange).toHaveBeenCalledWith("b");
  });

  it("supports typeahead, escapes and buffer reset", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useDropdown({ items, typeaheadDelay: 600 }),
    );

    act(() => result.current.triggerProps.onClick());
    act(() => result.current.listProps.onKeyDown(ev("b")));
    expect(result.current.getItemProps(1)["aria-selected"]).toBe(false);
    act(() => vi.advanceTimersByTime(700));

    act(() => result.current.triggerProps.onClick());
    act(() => result.current.listProps.onKeyDown(ev("Escape")));
    expect(result.current.triggerProps["aria-expanded"]).toBe(false);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("closes on outside pointerdown, disabled guard and empty items", () => {
    const { result } = renderHook(() => useDropdown({ items, disabled: true }));
    act(() => result.current.triggerProps.onClick());
    expect(result.current.triggerProps["aria-expanded"]).toBe(false);
    expect(result.current.triggerProps.disabled).toBe(true);

    const { result: open } = renderHook(() => useDropdown({ items }));
    act(() => open.current.triggerProps.onClick());
    fireEvent.pointerDown(document.body);
    expect(open.current.triggerProps["aria-expanded"]).toBe(false);

    const openAgain = renderHook(() => useDropdown({ items }));
    act(() => openAgain.result.current.triggerProps.onClick());
    act(() => openAgain.result.current.listProps.onKeyDown(ev("Tab")));
    expect(openAgain.result.current.triggerProps["aria-expanded"]).toBe(false);

    const empty = renderHook(() => useDropdown({ items: [] }));
    act(() => empty.result.current.triggerProps.onClick());
    expect(empty.result.current.triggerProps["aria-expanded"]).toBe(false);
  });

  it("typeahead with multi-char query continues from active index", () => {
    const { result } = renderHook(() =>
      useDropdown({
        items: [
          { value: "x", label: "Delta" },
          { value: "y", label: "Delphi" },
        ],
      }),
    );
    act(() => result.current.triggerProps.onClick());
    act(() => result.current.getItemProps(0).onPointerMove());
    act(() => result.current.listProps.onKeyDown(ev("d")));
    act(() => result.current.listProps.onKeyDown(ev("e")));
    const active = result.current.listProps["aria-activedescendant"];
    expect(active).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// useExpandingSearch
// ---------------------------------------------------------------------------
describe("useExpandingSearch", () => {
  it("expands, collapses and clears", () => {
    const onOpenChange = vi.fn();
    const { result } = renderHook(() =>
      useExpandingSearch({ onOpenChange }),
    );

    expect(result.current.open).toBe(false);
    act(() => result.current.expand());
    expect(result.current.open).toBe(true);

    act(() => result.current.toggle());
    expect(result.current.open).toBe(false);

    act(() => result.current.expand());
    act(() => result.current.collapse());
    expect(result.current.open).toBe(false);
    expect(onOpenChange).toHaveBeenCalled();
  });

  it("debounces changes into onSearch, flush and submit", () => {
    const onChange = vi.fn();
    const onSearch = vi.fn();
    const onSubmit = vi.fn();
    const { result } = renderHook(() =>
      useExpandingSearch({ onChange, onSearch, onSubmit, debounce: 200 }),
    );

    act(() =>
      result.current.inputProps.onChange({
        currentTarget: { value: "needle" },
      } as React.ChangeEvent<HTMLInputElement>),
    );
    expect(result.current.query).toBe("needle");
    expect(onChange).toHaveBeenCalledWith("needle");
    expect(onSearch).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(200));
    expect(onSearch).toHaveBeenCalledWith("needle");

    act(() =>
      result.current.inputProps.onChange({
        currentTarget: { value: "more" },
      } as React.ChangeEvent<HTMLInputElement>),
    );
    act(() => result.current.inputProps.onKeyDown(ev("Enter")));
    expect(onSubmit).toHaveBeenCalledWith("more");
    expect(onSearch).toHaveBeenCalledTimes(2);
  });

  it("clears query and triggers onSearch immediately via Enter", () => {
    const onSearch = vi.fn();
    const { result } = renderHook(() =>
      useExpandingSearch({ defaultValue: "abc", onSearch }),
    );

    act(() =>
      result.current.inputProps.onChange({
        currentTarget: { value: "abc" },
      } as React.ChangeEvent<HTMLInputElement>),
    );
    act(() => result.current.inputProps.onKeyDown(ev("Enter")));
    expect(onSearch).toHaveBeenCalledWith("abc");
  });

  it("Escape clears query then collapses", () => {
    const { result } = renderHook(() =>
      useExpandingSearch({ defaultValue: "abc" }),
    );
    const esc = {
      key: "Escape",
      preventDefault: () => undefined,
      stopPropagation: () => undefined,
    } as React.KeyboardEvent;
    act(() => result.current.inputProps.onKeyDown(esc));
    expect(result.current.query).toBe("");

    act(() => result.current.inputProps.onKeyDown(esc));
    expect(result.current.open).toBe(false);
  });

  it("respects disabled and controlled mode", () => {
    const onOpenChange = vi.fn();
    const { result } = renderHook(() =>
      useExpandingSearch({ disabled: true, open: false, onOpenChange }),
    );
    act(() => result.current.expand());
    expect(result.current.open).toBe(false);

    const { result: ctrl } = renderHook(() =>
      useExpandingSearch({ open: true }),
    );
    act(() => ctrl.current.collapse());
    act(() => ctrl.current.triggerProps.onClick());
    expect(ctrl.current.open).toBe(true);
  });

  it("blur collapse behaviors", () => {
    const { result } = renderHook(() =>
      useExpandingSearch({ defaultValue: "q", collapseOnBlur: false }),
    );
    act(() => result.current.inputProps.onFocus());
    expect(result.current.open).toBe(true);

    const evFocus = {
      relatedTarget: null,
      currentTarget: document.createElement("div"),
    } as unknown as React.FocusEvent<HTMLElement>;
    act(() => result.current.rootProps.onBlur(evFocus));
    expect(result.current.open).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// useTooltip
// ---------------------------------------------------------------------------
describe("useTooltip", () => {
  it("opens via pointer after openDelay and closes after closeDelay", () => {
    const { result } = renderHook(() => useTooltip({}));

    act(() =>
      result.current.triggerProps.onPointerEnter({
        clientX: 100,
      } as React.PointerEvent),
    );
    expect(result.current.open).toBe(false);
    act(() => vi.advanceTimersByTime(200));
    expect(result.current.open).toBe(true);
    expect(result.current.tooltipId).toBeTruthy();

    act(() => result.current.triggerProps.onPointerLeave({} as React.PointerEvent));
    act(() => vi.advanceTimersByTime(120));
    expect(result.current.open).toBe(false);
  });

  it("immediate open via focus, escape dismiss and cancel", () => {
    const { result } = renderHook(() => useTooltip({}));

    act(() => result.current.triggerProps.onFocus({} as React.FocusEvent));
    expect(result.current.open).toBe(true);

    act(() => result.current.triggerProps.onKeyDown(ev("Escape")));
    act(() => result.current.triggerProps.onBlur({} as React.FocusEvent));
    expect(result.current.open).toBe(false);

    act(() =>
      result.current.triggerProps.onPointerEnter({
        clientX: 60,
      } as React.PointerEvent),
    );
    act(() => vi.advanceTimersByTime(200));
    expect(result.current.open).toBe(true);

    act(() => result.current.triggerProps.onPointerCancel({} as React.PointerEvent));
    expect(result.current.open).toBe(false);
  });

  it("dismiss blocks re-open until unblock, and skip/warm settle", () => {
    const { result } = renderHook(() => useTooltip({}));

    act(() => result.current.triggerProps.onPointerDown({} as React.PointerEvent));
    act(() =>
      result.current.triggerProps.onPointerEnter({
        clientX: 200,
      } as React.PointerEvent),
    );
    act(() => vi.advanceTimersByTime(500));
    expect(result.current.open).toBe(false);

    act(() => result.current.triggerProps.onPointerLeave({} as React.PointerEvent));
    act(() => result.current.triggerProps.onBlur({} as React.FocusEvent));

    act(() => result.current.triggerProps.onFocus({} as React.FocusEvent));
    expect(result.current.open).toBe(true);

    act(() => result.current.triggerProps.onBlur({} as React.FocusEvent));
    expect(result.current.open).toBe(false);
    act(() => vi.advanceTimersByTime(120));
    act(() => vi.advanceTimersByTime(400));
    expect(result.current.warm).toBe(false);
  });

  it("disabled hides open tooltip", () => {
    const { result } = renderHook(() => useTooltip({ disabled: true }));
    act(() => result.current.triggerProps.onPointerEnter({} as React.PointerEvent));
    act(() => vi.advanceTimersByTime(200));
    expect(result.current.open).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// usePopover
// ---------------------------------------------------------------------------
describe("usePopover", () => {
  it("returns update without throwing when refs unset", () => {
    const { result } = renderHook(() => usePopover({ open: true }));
    expect(() => act(() => result.current.update())).not.toThrow();
    expect(result.current.side).toBe("bottom");
  });

  it("positions when refs are attached", () => {
    const { result } = renderHook(() => usePopover({ open: true, side: "bottom", align: "center" }));

    const anchor = document.createElement("div");
    const wrap = document.createElement("div");
    const panel = document.createElement("div");
    const content = document.createElement("div");
    const arrow = document.createElement("span");
    wrap.style.display = "block";

    // @ts-expect-error refs accept null in types; assigning a test element
    result.current.anchorRef.current = anchor;
    // @ts-expect-error refs accept null in types; assigning a test element
    result.current.floatingRef.current = wrap;
    // @ts-expect-error refs accept null in types; assigning a test element
    result.current.panelRef.current = panel;
    // @ts-expect-error refs accept null in types; assigning a test element
    result.current.contentRef.current = content;
    // @ts-expect-error refs accept null in types; assigning a test element
    result.current.arrowRef.current = arrow;

    expect(() => act(() => result.current.update())).not.toThrow();
    expect(wrap.style.top).not.toBe("");
  });
});

// ---------------------------------------------------------------------------
// useContextMenu
// ---------------------------------------------------------------------------
describe("useContextMenu", () => {
  const items = [
    { id: "cut", label: "Cut" },
    { id: "copy", label: "Copy" },
    { id: "sep", label: "", type: "separator" },
    { id: "paste", label: "Paste", disabled: true },
    { id: "rename", label: "Rename" },
  ] as const;

  it("opens via contextmenu event and closes", () => {
    const onSelect = vi.fn();
    const { result } = renderHook(() =>
      useContextMenu({ items: toMenuItems(items), onSelect }),
    );

    expect(result.current.isOpen).toBe(false);
    act(() =>
      result.current.triggerProps.onContextMenu({
        clientX: 120,
        clientY: 80,
        preventDefault: () => undefined,
        stopPropagation: () => undefined,
        currentTarget: document.createElement("div"),
      } as unknown as React.MouseEvent),
    );
    expect(result.current.isOpen).toBe(true);
    expect(result.current.placement).not.toBeNull();
    expect(result.current.active).toBe(-1);

    act(() => fireEvent.keyDown(document, { key: "Escape" }));
    expect(result.current.isOpen).toBe(false);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("navigates, selects and opens via keyboard", () => {
    const onSelect = vi.fn();
    const { result } = renderHook(() =>
      useContextMenu({ items: toMenuItems(items), onSelect }),
    );

    act(() =>
      result.current.triggerProps.onKeyDown({
        key: "ContextMenu",
        preventDefault: () => undefined,
        currentTarget: document.createElement("div"),
      } as unknown as React.KeyboardEvent),
    );
    expect(result.current.isOpen).toBe(true);
    expect(result.current.active).toBe(0);

    act(() => result.current.menuProps.onKeyDown(ev("ArrowDown")));
    expect(result.current.active).toBe(1);
    act(() => result.current.menuProps.onKeyDown(ev("ArrowDown")));
    expect(result.current.active).toBe(4);

    act(() => result.current.menuProps.onKeyDown(ev("Home")));
    expect(result.current.active).toBe(0);
    act(() => result.current.menuProps.onKeyDown(ev("End")));
    expect(result.current.active).toBe(4);

    act(() => result.current.menuProps.onKeyDown(ev("Enter")));
    expect(onSelect).not.toHaveBeenCalled();

    act(() => result.current.menuProps.onKeyDown(ev("End")));
    act(() =>
      result.current
        .getItemProps(result.current.active)
        .onClick({ detail: 0 } as React.MouseEvent),
    );
    expect(onSelect).toHaveBeenCalledWith("rename");
    expect(result.current.isOpen).toBe(false);
  });

  it("typeahead selects by label", () => {
    const { result } = renderHook(() =>
      useContextMenu({ items: toMenuItems(items), onSelect: vi.fn() }),
    );
    act(() => result.current.triggerProps.onKeyDown({
      key: "ContextMenu",
      preventDefault: () => undefined,
      currentTarget: document.createElement("div"),
    } as unknown as React.KeyboardEvent));

    act(() => result.current.menuProps.onKeyDown(ev("r")));
    act(() => result.current.menuProps.onKeyDown(ev("e")));
    expect([0, 1, 2, 3, 4]).toContain(result.current.active);
  });

  it("getItemProps pointer move and click choose", () => {
    const onSelect = vi.fn();
    const { result } = renderHook(() =>
      useContextMenu({ items: toMenuItems(items), onSelect }),
    );

    act(() => result.current.triggerProps.onContextMenu({
      clientX: 0,
      clientY: 0,
      preventDefault: () => undefined,
      stopPropagation: () => undefined,
      currentTarget: document.createElement("div"),
    } as unknown as React.MouseEvent));

    act(() => result.current.getItemProps(0).onPointerDown());
    act(() => result.current.getItemProps(0).onClick({ detail: 1 } as React.MouseEvent));
    expect(onSelect).toHaveBeenCalledWith("cut");
    expect(result.current.isOpen).toBe(false);
  });

  it("disabled does not open and touch hold works", () => {
    const { result } = renderHook(() =>
      useContextMenu({ items: toMenuItems(items), disabled: true }),
    );
    act(() => result.current.triggerProps.onContextMenu({ preventDefault: () => undefined, stopPropagation: () => undefined, clientX: 0, clientY: 0, currentTarget: document.createElement("div") } as unknown as React.MouseEvent));
    expect(result.current.isOpen).toBe(false);

    const { result: touch } = renderHook(() =>
      useContextMenu({ items: toMenuItems(items), holdDuration: 300 }),
    );
    act(() =>
      touch.current.triggerProps.onPointerDown({
        pointerType: "touch",
        clientX: 10,
        clientY: 10,
        currentTarget: document.createElement("div"),
      } as unknown as React.PointerEvent),
    );
    act(() => touch.current.triggerProps.onPointerMove({ clientX: 12, clientY: 12 } as React.PointerEvent));
    act(() => vi.advanceTimersByTime(300));
    expect(touch.current.isOpen).toBe(true);

    act(() => touch.current.triggerProps.onPointerUp({} as React.PointerEvent));
    act(() => touch.current.triggerProps.onClick({ preventDefault: () => undefined, stopPropagation: () => undefined } as React.MouseEvent));
    expect(touch.current.isOpen).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// useModal
// ---------------------------------------------------------------------------
describe("useModal", () => {
  it("closes via close(), Escape and backdrop", () => {
    const onClose = vi.fn();
    renderHook(() => useModal({ open: true, onClose }));

    act(() => fireEvent.keyDown(document, { key: "Escape" }));
    expect(onClose).toHaveBeenCalledTimes(1);

    const { result } = renderHook(() => useModal({ open: true, onClose }));
    act(() => result.current.close());
    expect(onClose).toHaveBeenCalledTimes(2);

    act(() => result.current.overlayProps.onPointerDown({ target: document.body } as React.PointerEvent));
    act(() => result.current.overlayProps.onClick({ target: document.body } as React.MouseEvent));
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it("respects closeOnEscape/closeOnBackdrop false", () => {
    const onClose = vi.fn();
    renderHook(() =>
      useModal({ open: true, onClose, closeOnEscape: false, closeOnBackdrop: false }),
    );

    act(() => fireEvent.keyDown(document, { key: "Escape" }));
    expect(onClose).not.toHaveBeenCalled();

    const { result } = renderHook(() =>
      useModal({ open: true, onClose, closeOnEscape: false, closeOnBackdrop: false }),
    );
    act(() => result.current.overlayProps.onPointerDown({ target: document.body } as React.PointerEvent));
    act(() => result.current.overlayProps.onClick({ target: document.body } as React.MouseEvent));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("exposes ids, target and panel props", () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useModal({ open: true, onClose }));
    expect(result.current.target).toBe(document.body);
    expect(result.current.titleId).toContain("title");
    expect(result.current.panelProps.role).toBe("dialog");
    expect(result.current.panelProps["aria-modal"]).toBe(true);
    expect(result.current.panelProps["aria-labelledby"]).toBe(result.current.titleId);

    act(() => result.current.panelProps.onKeyDown({ key: "Tab" } as React.KeyboardEvent));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("supports custom container", () => {
    const onClose = vi.fn();
    const container = document.createElement("div");
    const { result } = renderHook(() =>
      useModal({ open: true, onClose, container }),
    );
    expect(result.current.target).toBe(container);
  });
});

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
function kind({ id, focused }: { id: string; focused: string[] }) {
  return {
    focus: () => focused.push(id),
  } as unknown as HTMLButtonElement;
}

function ev(key: string) {
  return { key, preventDefault: () => undefined } as React.KeyboardEvent;
}

function toMenuItems(
  input: readonly { id: string; label: string; type?: string; disabled?: boolean }[],
) {
  return input as unknown as Parameters<typeof useContextMenu>[0]["items"];
}