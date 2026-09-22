import { useEffect, useRef } from "react";
import { create } from "zustand";

/**
 * Typed UI-intent bus (brainstorm P2-2 / P1 §5.1-13).
 *
 * Commands registered in the ⌘K palette (and any app action) must be able to
 * affect a screen they do not own — "open the create-contact dialog", "focus
 * the search input", "export the current result set". The codebase used
 * `window.dispatchEvent(new CustomEvent("cinq:create-contact"))` for this,
 * which is untyped, invisible to static analysis, and (measurably) broken:
 * only 2 of ~18 dispatched events had a listener, so most palette commands
 * silently did nothing.
 *
 * This store replaces that with a typed, testable request queue:
 *
 * ```ts
 * // producer (command, action, non-React code)
 * requestIntent("cinq", "contact.create");
 *
 * // consumer (the screen that owns the surface)
 * useIntents("cinq", {
 *   "contact.create": () => setCreateOpen(true),
 *   "search.focus": () => searchRef.current?.focus(),
 * });
 * ```
 *
 * Semantics: a request is delivered exactly once, to handlers that are
 * mounted at the time of {@link useIntents}' effect. Requests made before a
 * consumer mounts are still delivered when it mounts (that is what makes
 * "⌘K from another app, then navigate" work), and requests nobody consumes
 * are dropped after {@link INTENT_TTL_MS} so the queue cannot grow unbounded.
 */

/** Structural payload carried with a request (optional). */
export type IntentPayload = Record<string, unknown> | undefined;

/** Convenience alias: `(app, intent)` string pair used by consumers. */
export const intentKey = (app: string, intent: string): string =>
	`${app}:${intent}`;

export interface IntentRequest {
	/** Monotonic id, so a consumer consumes exactly the requests it saw. */
	id: number;
	app: string;
	intent: string;
	payload: IntentPayload;
	/** `Date.now()` at enqueue time — used for TTL pruning. */
	at: number;
}

/** How long an unconsumed request survives (navigation races must still land). */
export const INTENT_TTL_MS = 5_000;

interface IntentState {
	requests: IntentRequest[];
	/** Enqueue a request. Returns the request id. */
	request: (app: string, intent: string, payload?: IntentPayload) => number;
	/** Drop the given request ids (called by consumers after delivery). */
	consume: (ids: number[]) => void;
	/** Drop requests older than `maxAgeMs` (defaults to {@link INTENT_TTL_MS}). */
	prune: (maxAgeMs?: number) => void;
	/** Drop everything (used by tests and on logout). */
	clear: () => void;
}

let nextIntentId = 1;

/** Reset the id counter — test helper so assertions stay deterministic. */
export const resetIntentIds = (): void => {
	nextIntentId = 1;
};

export const useIntentStore = create<IntentState>((set) => ({
	requests: [],
	request: (app, intent, payload) => {
		const id = nextIntentId++;
		set((state) => ({
			requests: [
				...state.requests,
				{ id, app, intent, payload, at: Date.now() },
			],
		}));
		return id;
	},
	consume: (ids) => {
		if (ids.length === 0) return;
		const drop = new Set(ids);
		set((state) =>
			state.requests.some((r) => drop.has(r.id))
				? { requests: state.requests.filter((r) => !drop.has(r.id)) }
				: state,
		);
	},
	prune: (maxAgeMs = INTENT_TTL_MS) => {
		const cutoff = Date.now() - maxAgeMs;
		set((state) =>
			state.requests.some((r) => r.at < cutoff)
				? { requests: state.requests.filter((r) => r.at >= cutoff) }
				: state,
		);
	},
	clear: () => set({ requests: [] }),
}));

/**
 * Enqueue an intent request. Safe from non-React code (command registrars,
 * mutations, zustand actions) — reads the store imperatively.
 */
export const requestIntent = (
	app: string,
	intent: string,
	payload?: IntentPayload,
): number => useIntentStore.getState().request(app, intent, payload);

/** Handler map accepted by {@link useIntents}. */
export type IntentHandlers = Record<string, (payload: IntentPayload) => void>;

/**
 * Subscribe a component to one or more intents of a single app.
 *
 * The handler map is read through a ref, so callers may pass a fresh object
 * literal on every render without re-subscribing (and without stale closures).
 */
export const useIntents = (app: string, handlers: IntentHandlers): void => {
	const requests = useIntentStore((s) => s.requests);
	const consume = useIntentStore((s) => s.consume);

	const handlersRef = useRef(handlers);
	useEffect(() => {
		handlersRef.current = handlers;
	}, [handlers]);

	useEffect(() => {
		const mine = requests.filter((r) => r.app === app);
		if (mine.length === 0) return;
		const delivered: number[] = [];
		for (const request of mine) {
			const handler = handlersRef.current[request.intent];
			// Only consume what we can actually handle: an intent for another
			// screen of the same app must stay queued for that screen.
			if (!handler) continue;
			delivered.push(request.id);
			handler(request.payload);
		}
		consume(delivered);
	}, [requests, app, consume]);
};

/** Single-intent shorthand for components that own exactly one surface. */
export const useIntent = (
	app: string,
	intent: string,
	handler: (payload: IntentPayload) => void,
): void => {
	const requests = useIntentStore((s) => s.requests);
	const consume = useIntentStore((s) => s.consume);

	const handlerRef = useRef(handler);
	useEffect(() => {
		handlerRef.current = handler;
	}, [handler]);

	useEffect(() => {
		const mine = requests.filter(
			(r) => r.app === app && r.intent === intent,
		);
		if (mine.length === 0) return;
		consume(mine.map((r) => r.id));
		for (const request of mine)
			handlerRef.current(request.payload);
	}, [requests, app, intent, consume]);
};

/**
 * Recent-activity store (brainstorm P2-1, "palette recents + recent section
 * in the app switcher"). Persisted in localStorage so a user's trail survives
 * a refresh.
 *
 * Every command registrar / `onSelect` handler calls {@link registerRecent}
 * so the palette can surface "what you did last" without a backend round-trip.
 * Once the tenant/user prefs endpoints land (§4.2), this moves server-side.
 */

export interface RecentActivity {
	id: string;
	app: string;
	intent: string;
	label: string;
	href?: string;
	at: number;
}

const RECENT_KEY = "ataqu.palette.recents-v1";
const MAX_RECENT = 12;
const RECENT_TTL_MS = 24 * 60 * 60 * 1000; // 24h

const recentId = (app: string, intent: string): string => `${app}:${intent}`;

export const useRecentStore = create<{
	recents: RecentActivity[];
	push: (entry: Omit<RecentActivity, "id" | "at">) => void;
	clear: () => void;
}>((set) => ({
	recents: [],
	push: (entry) =>
		set((state) => {
			const seen = new Map<string, RecentActivity>();
			for (const r of state.recents)
				if (r.at >= Date.now() - RECENT_TTL_MS) seen.set(r.id, r);
			const fresh = {
				...entry,
				id: recentId(entry.app, entry.intent),
				at: Date.now(),
			};
			seen.set(fresh.id, fresh);
			const ordered = Array.from(seen.values()).sort(
				(a, b) => b.at - a.at,
			);
			return {
				recents:
					ordered.length > MAX_RECENT
						? ordered.slice(0, MAX_RECENT)
						: ordered,
			};
		}),
	clear: () => set({ recents: [] }),
}));

if (typeof window !== "undefined") {
	const stored = (() => {
		try {
			return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
		} catch {
			return [];
		}
	})() as RecentActivity[];
	if (Array.isArray(stored) && stored.length > 0) {
		useRecentStore.setState({
			recents: stored.filter(
				(r): r is RecentActivity =>
					typeof r === "object" &&
					typeof r.app === "string" &&
					typeof r.intent === "string" &&
					typeof r.label === "string" &&
					r.at >= Date.now() - RECENT_TTL_MS,
			),
		});
	}
	// Persist recents to localStorage on every change (zustand v4 subscribe
	// API: single (state, prevState) => void callback).
	useRecentStore.subscribe(
		(state, prevState) => {
			if (state.recents !== prevState.recents) {
				try {
					localStorage.setItem(
						RECENT_KEY,
						JSON.stringify(
							state.recents as readonly RecentActivity[],
						),
					);
				} catch {
					/* QuotaExceededError is harmless. */
				}
			}
		},
	);
}

/**
 * Register a recently-fired palette intent (from a command registrar or
 * `onSelect` handler). Safe from non-React code.
 */
export const registerRecent = (
	app: string,
	intent: string,
	label: string,
	href?: string,
): void => {
	useRecentStore.getState().push({ app, intent, label, href });
};
