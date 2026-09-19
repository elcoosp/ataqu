import { act, renderHook } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import {
	enumSearch,
	intSearch,
	normalizeSearch,
	type SearchUpdater,
	searchSchema,
	stringSearch,
	useUrlSearchParam,
	useUrlState,
} from "../src/use-url-state";

describe("url-state helpers", () => {
	it("enumSearch accepts allowed values and falls back otherwise", () => {
		const parse = enumSearch(["all", "company", "person"] as const, "all");
		expect(parse("company")).toBe("company");
		expect(parse("bogus")).toBe("all");
		expect(parse(undefined)).toBe("all");
		expect(parse(42)).toBe("all");
	});

	it("intSearch coerces numeric strings, numbers, and floors at min", () => {
		const parse = intSearch(0, 0);
		expect(parse("3")).toBe(3);
		expect(parse(7)).toBe(7);
		expect(parse("abc")).toBe(0);
		expect(parse("")).toBe(0);
		expect(parse(undefined)).toBe(0);
		expect(intSearch(5, 2)("1")).toBe(5);
		expect(intSearch(5, 2)(1)).toBe(5);
	});

	it("stringSearch passes strings through and falls back otherwise", () => {
		const parse = stringSearch("fallback");
		expect(parse("hello")).toBe("hello");
		expect(parse(undefined)).toBe("fallback");
		expect(parse(9)).toBe("fallback");
	});

	it("searchSchema coerces declared keys and preserves the rest", () => {
		const validate = searchSchema({
			filter: enumSearch(["all", "company", "person"] as const, "all"),
			q: stringSearch(),
		});
		expect(validate({ filter: "company", q: "acme", peek: "1" })).toEqual({
			filter: "company",
			q: "acme",
			peek: "1",
		});
		expect(validate({ filter: "evil'; DROP", q: 42 })).toEqual({
			filter: "all",
			q: "",
		});
	});

	it("normalizeSearch layers defaults under raw params", () => {
		expect(normalizeSearch({ a: 1 }, { a: 0, b: "x" })).toEqual({
			a: 1,
			b: "x",
		});
	});
});

describe("useUrlState", () => {
	function setup(initial: Record<string, unknown>) {
		let current = { ...initial };
		const setSearch = vi.fn((next: SearchUpdater<Record<string, unknown>>) => {
			const partial = typeof next === "function" ? next(current) : next;
			current = { ...current, ...partial };
			for (const [k, v] of Object.entries(partial)) {
				if (v === undefined) delete current[k];
			}
		});
		const useFilter = (search: Record<string, unknown>) =>
			useUrlState({
				search,
				setSearch,
				key: "filter",
				default: "all",
				parse: (v) => (v === "company" || v === "person" ? v : "all"),
			});
		return { current: () => current, setSearch, useFilter };
	}

	it("reads the parsed value from search and merges writes", () => {
		const s = setup({ filter: "company" });
		const { result } = renderHook(() => s.useFilter(s.current()));
		expect(result.current[0]).toBe("company");
		act(() => result.current[1]("person"));
		expect(s.setSearch).toHaveBeenCalledTimes(1);
		expect(s.current()).toEqual({ filter: "person" });
	});

	it("falls back for unknown values and drops default keys on write", () => {
		const s = setup({ filter: "hacked" });
		const { result } = renderHook(() => s.useFilter(s.current()));
		expect(result.current[0]).toBe("all");
		act(() => result.current[1]("all"));
		const updater = s.setSearch.mock.calls[0]?.[0] as (
			prev: Record<string, unknown>,
		) => Record<string, unknown>;
		expect(typeof updater).toBe("function");
		expect(updater(s.current())).toEqual({ filter: undefined });
	});

	it("is a no-op write when the value is unchanged", () => {
		const s = setup({ filter: "company" });
		const { result } = renderHook(() => s.useFilter(s.current()));
		act(() => result.current[1]("company"));
		const updater = s.setSearch.mock.calls[0]?.[0] as (
			prev: Record<string, unknown>,
		) => Record<string, unknown>;
		expect(updater(s.current())).toEqual({});
	});

	it("supports serialize for non-string values", () => {
		const setSearch = vi.fn();
		const { result } = renderHook(() =>
			useUrlState({
				search: {},
				setSearch,
				key: "page",
				default: 1,
				parse: (v) => intSearch(1, 1)(v),
				serialize: (v: number) => (v === 1 ? undefined : String(v)),
			}),
		);
		expect(result.current[0]).toBe(1);
		act(() => result.current[1](4));
		const updater = setSearch.mock.calls[0]?.[0] as (
			prev: Record<string, unknown>,
		) => Record<string, unknown>;
		expect(updater({})).toEqual({ page: "4" });
	});
});

describe("useUrlSearchParam", () => {
	function setQuery(query: string) {
		window.history.replaceState(null, "", `/x${query}`);
	}

	it("reads, writes, and removes the key via replaceState", () => {
		setQuery("?filter=company&other=1");
		const { result } = renderHook(() =>
			useUrlSearchParam("filter", {
				default: "all",
				parse: (v) => (v === "company" || v === "person" ? v : "all"),
			}),
		);
		expect(result.current[0]).toBe("company");
		act(() => result.current[1]("person"));
		expect(window.location.search).toBe("?filter=person&other=1");
		act(() => result.current[1]("all"));
		expect(window.location.search).toBe("?other=1");
		expect(result.current[0]).toBe("all");
	});

	it("falls back to default when the key is absent or invalid", () => {
		setQuery("?filter=nope");
		const { result } = renderHook(() =>
			useUrlSearchParam("filter", {
				default: "all",
				parse: (v) => (v === "company" ? v : "all"),
			}),
		);
		expect(result.current[0]).toBe("all");
	});

	it("drives a controlled enum without a router", () => {
		setQuery("");
		const { result } = renderHook(() => {
			const [tab, setTab] = useUrlSearchParam("tab", {
				default: "activities",
				parse: (v) => (v === "tasks" || v === "tracking" ? v : "activities"),
			});
			const [count, setCount] = useState(0);
			return { tab, setTab, count, setCount };
		});
		act(() => result.current.setTab("tasks"));
		expect(result.current.tab).toBe("tasks");
		expect(window.location.search).toBe("?tab=tasks");
		act(() => result.current.setCount(1));
		expect(result.current.count).toBe(1);
		expect(result.current.tab).toBe("tasks");
	});

	it("round-trips a boolean modal flag as ?key=1 and omits it when closed", () => {
		// The pattern every route uses for modal-open state (brainstorm P1-3).
		const booleanFlag = {
			default: false,
			parse: (v: string | undefined) => v === "1",
			serialize: (v: boolean) => (v ? "1" : undefined),
		};

		setQuery("?createOpen=1&filter=company");
		const { result } = renderHook(() =>
			useUrlSearchParam("createOpen", booleanFlag),
		);
		// Reads a hand-typed "1" back as true without disturbing siblings.
		expect(result.current[0]).toBe(true);
		expect(window.location.search).toBe("?createOpen=1&filter=company");

		setQuery("");
		const closed = renderHook(() =>
			useUrlSearchParam("createOpen", booleanFlag),
		);
		expect(closed.result.current[0]).toBe(false);
		act(() => closed.result.current[1](true));
		expect(window.location.search).toBe("?createOpen=1");
		act(() => closed.result.current[1](false));
		// Closing removes the key entirely, so clean links stay clean.
		expect(window.location.search).toBe("");
		expect(closed.result.current[0]).toBe(false);
	});

	it("accumulates distinct keys across sibling hooks without clobbering", () => {
		setQuery("");
		const { result } = renderHook(() => ({
			filter: useUrlSearchParam("filter", {
				default: "all",
				parse: (v: string | undefined) =>
					v === "company" || v === "person" ? v : "all",
				serialize: (v: string) => (v === "all" ? undefined : v),
			}),
			sort: useUrlSearchParam("sort", {
				default: null as string | null,
				parse: (v: string | undefined) =>
					v === "name" || v === "email" ? v : null,
				serialize: (v: string | null) => v ?? undefined,
			}),
		}));
		act(() => result.current.filter[1]("company"));
		act(() => result.current.sort[1]("email"));
		// Both writes survive: each hook re-reads window.location before
		// writing, so it only ever touches its own key.
		expect(window.location.search).toBe("?filter=company&sort=email");
		act(() => result.current.filter[1]("all"));
		expect(window.location.search).toBe("?sort=email");
	});
});
