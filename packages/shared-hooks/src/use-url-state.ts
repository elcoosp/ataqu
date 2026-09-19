import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * URL search-param state (brainstorm P1-5).
 *
 * Filters, sorts, tabs, and peek targets all belong in the URL so a view is
 * shareable and the back button is real navigation. This hook constrains the
 * value to a declared shape, so a hand-typed URL can never feed a component
 * a value it does not understand.
 *
 * Route wiring (TanStack Router v1) — declare the search schema on the
 * route, then hand the hook `Route.useSearch()` plus a thin `navigate`
 * wrapper. `Route.useNavigate()` writes merge by default but can replace
 * instead, so always wrap it to force a merge and drop `undefined` keys:
 *
 *   export const Route = createFileRoute("/_auth/cinq/contacts/")({
 *     validateSearch: contactsSearchSchema,
 *     component: ContactsPage,
 *   });
 *
 *   function ContactsPage() {
 *     const search = Route.useSearch();
 *     const navigate = Route.useNavigate();
 *     const setSearch: SearchUpdater<ContactsSearch> = (next) =>
 *       navigate({ search: next as never });
 *     const [filter, setFilter] = useUrlState({
 *       search, setSearch, key: "filter", default: "all",
 *       parse: (v) => (v === "company" || v === "person" ? v : "all"),
 *     });
 *   }
 *
 * Plain-object writes merge over the current search. Differences are found
 * by reference, so the value setter is a no-op when nothing changed.
 */

/**
 * Minimal updater accepted by TanStack Router's `navigate({ search })`.
 * The router calls the function form with the previous search and merges
 * the returned object; we mirror that contract so a hook-level setter can
 * be passed straight through to `navigate`.
 */
export type SearchUpdater<TSearch extends Record<string, unknown>> =
	| Partial<TSearch>
	| ((prev: TSearch) => Partial<TSearch>);

export interface UrlStateAdapter<TSearch extends Record<string, unknown>> {
	/** Current search params (e.g. `Route.useSearch()`). */
	search: TSearch;
	/**
	 * Write search params. Accepts either a partial object (merged over the
	 * current search, with `undefined` values dropped) or an updater
	 * function; pass the route's `navigate` wrapper straight in.
	 */
	setSearch: (next: SearchUpdater<TSearch>) => void;
}

export interface UseUrlStateOptions<T> {
	key: string;
	default: T;
	/** Coerce/normalize a raw string into `T` (invalid input → `default`). */
	parse?: (raw: string | undefined) => T;
	/** Serialize `T` back into the URL. Return `undefined` to omit the key. */
	serialize?: (value: T) => string | undefined;
}

/** Declarative route `validateSearch` helper for string enums. */
export function enumSearch<T extends string>(
	allowed: readonly T[],
	fallback: T,
) {
	return (raw: unknown): T =>
		typeof raw === "string" && (allowed as readonly string[]).includes(raw)
			? (raw as T)
			: fallback;
}

/** Declarative route `validateSearch` helper for integers. */
export function intSearch(fallback: number, min = 0) {
	return (raw: unknown): number => {
		if (typeof raw === "number" && Number.isInteger(raw)) {
			return raw < min ? fallback : raw;
		}
		const n =
			typeof raw === "string" && raw.trim() !== ""
				? Number.parseInt(raw, 10)
				: NaN;
		if (!Number.isFinite(n)) return fallback;
		return n < min ? fallback : n;
	};
}

/** Declarative route `validateSearch` helper for free-text query strings. */
export function stringSearch(fallback = "") {
	return (raw: unknown): string =>
		typeof raw === "string" ? raw : fallback;
}

/**
 * Compose per-key coercers into a `validateSearch` function. Unknown keys
 * pass through untouched; declared keys always come back well-typed even
 * for hand-edited URLs.
 *
 *   export const Route = createFileRoute("/_auth/cinq/contacts/")({
 *     validateSearch: searchSchema({
 *       filter: enumSearch(["all", "company", "person"], "all"),
 *       q: stringSearch(),
 *     }),
 *     component: ContactsPage,
 *   });
 */
export function searchSchema<T extends Record<string, (raw: unknown) => unknown>>(
	coercers: T,
) {
	return (raw: Record<string, unknown>): { [K in keyof T]: ReturnType<T[K]> } => {
		const out: Record<string, unknown> = { ...raw };
		for (const key of Object.keys(coercers)) {
			out[key] = coercers[key]?.(raw[key]);
		}
		return out as { [K in keyof T]: ReturnType<T[K]> };
	};
}

/** Builds a `validateSearch`-compatible schema-less normalizer. */
export function normalizeSearch<T extends Record<string, unknown>>(
	raw: Record<string, unknown>,
	defaults: T,
): T {
	return { ...defaults, ...raw } as T;
}

export function useUrlState<TSearch extends Record<string, unknown>, T>({
	search,
	setSearch,
	key,
	default: fallback,
	parse,
	serialize,
}: UrlStateAdapter<TSearch> & UseUrlStateOptions<T>): [T, (next: T) => void] {
	const raw = search[key];
	const value = useMemo(() => {
		if (parse) return parse(raw === undefined ? undefined : String(raw));
		return (raw === undefined ? fallback : (raw as T)) as T;
	}, [raw, parse, fallback]);

	const set = useCallback(
		(next: T) => {
			const encoded = serialize
				? serialize(next)
				: next === fallback
					? undefined
					: String(next);
			setSearch((prev) => {
				const prevValue =
					prev[key] === undefined ? fallback : (prev[key] as T);
				// Reference check: enum strings are cheap to compare; objects
				// must implement their own equality via serialize/parse.
				if (prevValue === next) return {};
				return { [key]: encoded } as Partial<TSearch>;
			});
		},
		[setSearch, key, serialize, fallback],
	);

	return [value, set];
}

/**
 * Window-location-backed search state for components that render outside a
 * route tree (or in tests). Same `[value, set]` contract as `useUrlState`,
 * reading `location.search` and writing via `history.replaceState` so typing
 * in a filter box never pushes a history entry per keystroke.
 *
 * Prefer passing `Route.useSearch()` + a `navigate` wrapper into
 * `useUrlState` from route components; only reach for this fallback when no
 * router context is available.
 */
export function useUrlSearchParam<T>(
	key: string,
	options: Omit<UseUrlStateOptions<T>, "key">,
): [T, (next: T) => void] {
	const { default: fallback, parse, serialize } = options;
	const read = (): T => {
		if (typeof window === "undefined") return fallback;
		const raw = new URLSearchParams(window.location.search).get(key);
		if (parse) return parse(raw ?? undefined);
		return (raw === null ? fallback : (raw as T)) as T;
	};

	const [snapshot, setSnapshot] = useState<T>(read);

	useEffect(() => {
		setSnapshot(read());
		// Re-read when the key changes; cross-hook sync is intentionally
		// out of scope — route-driven views use useUrlState instead.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [key]);

	const set = useCallback(
		(next: T) => {
			setSnapshot(next);
			if (typeof window === "undefined") return;
			const params = new URLSearchParams(window.location.search);
			const encoded = serialize
				? serialize(next)
				: next === fallback
					? undefined
					: String(next);
			if (encoded === undefined) params.delete(key);
			else params.set(key, encoded);
			const query = params.toString();
			window.history.replaceState(
				null,
				"",
				`${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`,
			);
		},
		[key, serialize, fallback],
	);

	return [snapshot, set];
}