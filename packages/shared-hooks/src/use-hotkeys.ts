import { useCallback, useEffect } from "react";
import {
	eventToToken,
	isEditableTarget,
	SEQUENCE_TIMEOUT_MS,
	type ShortcutScope,
} from "./shortcuts";

export const useHotkeys = (
	key: string,
	callback: (event: KeyboardEvent) => void,
	deps: React.DependencyList = [],
) => {
	const handler = useCallback(
		(event: KeyboardEvent) => {
			const isMatch =
				(event.metaKey || event.ctrlKey) &&
				event.key.toLowerCase() === key.toLowerCase();
			if (isMatch) {
				event.preventDefault();
				callback(event);
			}
		},
		[key, callback],
	);

	useEffect(() => {
		document.addEventListener("keydown", handler);
		return () => {
			document.removeEventListener("keydown", handler);
		};
	}, [handler, ...deps]);
};

/* -------------------------------------------------------------------------
 * Keyboard engine (brainstorm P2-3)
 *
 * A single process-wide `keydown` dispatcher owns:
 *   - sequence chords (`g d`) with an inter-key timeout
 *   - scopes (global / list / detail / modal)
 *   - input-field guarding (bare letters never fire while typing)
 *
 * Bindings register themselves; the listener is installed lazily and removed
 * once the last binding unregisters, so an unopened screen costs nothing.
 * ---------------------------------------------------------------------- */

export interface UseShortcutOptions {
	/** Surface that must be active. Defaults to "global". */
	scope?: ShortcutScope;
	/** Temporarily disable without unmounting. Defaults to true. */
	enabled?: boolean;
	/**
	 * Fire even when focus is in a text field. By default only chords with a
	 * modifier (and Escape) do so — bare letters must remain typeable.
	 */
	allowInInput?: boolean;
	/** Call `preventDefault()` on match. Defaults to true. */
	preventDefault?: boolean;
}

interface Binding {
	keys: string;
	scope: ShortcutScope;
	allowInInput: boolean;
	preventDefault: boolean;
	enabled: boolean;
	handler: (event: KeyboardEvent) => void;
}

const bindings = new Set<Binding>();
const activeScopes = new Set<ShortcutScope>();
let listenerInstalled = false;
let pendingPrefix: { prefix: string; at: number } | null = null;

/** Chords containing a modifier are safe to fire while typing (K, ⌘⏎). */
function allowedWhileTyping(keys: string): boolean {
	if (keys === "escape") return true;
	return keys.split(" ").every((chord) => chord.includes("+"));
}

function isModalOpen(): boolean {
	if (typeof document === "undefined") return false;
	return !!document.querySelector(
		'[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]',
	);
}

function scopeAllows(scope: ShortcutScope): boolean {
	if (scope === "global") return true;
	if (scope === "modal") return isModalOpen();
	return activeScopes.has(scope);
}

/** True when `token` could begin a registered sequence (e.g. "g" for "g d"). */
function isSequenceStart(token: string): boolean {
	for (const binding of bindings) {
		if (binding.enabled && binding.keys.startsWith(`${token} `)) return true;
	}
	return false;
}

function resetSequence(): void {
	pendingPrefix = null;
}

function dispatch(event: KeyboardEvent): void {
	const token = eventToToken(event);
	if (token === null) return;

	// A pending sequence is only valid within its timeout window.
	if (pendingPrefix && Date.now() - pendingPrefix.at > SEQUENCE_TIMEOUT_MS) {
		resetSequence();
	}

	const sequenceCandidate = pendingPrefix
		? `${pendingPrefix.prefix} ${token}`
		: null;
	const typing = isEditableTarget(event.target);

	let handled = false;
	for (const binding of bindings) {
		if (!binding.enabled) continue;
		const matches =
			binding.keys === sequenceCandidate || binding.keys === token;
		if (!matches) continue;
		if (!scopeAllows(binding.scope)) continue;
		if (typing && !binding.allowInInput && !allowedWhileTyping(binding.keys)) {
			continue;
		}
		if (binding.preventDefault) event.preventDefault();
		handled = true;
		binding.handler(event);
	}

	// Arm a new sequence only when this key was not itself consumed and some
	// binding expects it as a prefix — so a lone `d` never arms a phantom.
	resetSequence();
	if (!handled && isSequenceStart(token)) {
		pendingPrefix = { prefix: token, at: Date.now() };
	}
}

function ensureListener(): void {
	if (listenerInstalled || typeof document === "undefined") return;
	document.addEventListener("keydown", dispatch);
	listenerInstalled = true;
}

function removeListenerIfIdle(): void {
	if (!listenerInstalled || bindings.size > 0) return;
	document.removeEventListener("keydown", dispatch);
	listenerInstalled = false;
	resetSequence();
}

/**
 * Bind one or more key specs to a handler.
 *
 *   useShortcut("mod+k", openPalette);
 *   useShortcut("g d", () => navigate({ to: "/dashboard" }));
 *   useShortcut("j", nextRow, { scope: "list" });
 */
export function useShortcut(
	keys: string | string[],
	handler: (event: KeyboardEvent) => void,
	options: UseShortcutOptions = {},
): void {
	const {
		scope = "global",
		enabled = true,
		allowInInput = false,
		preventDefault = true,
	} = options;
	const keySpec = Array.isArray(keys) ? keys.join("|") : keys;

	useEffect(() => {
		if (!enabled) return;
		const specs = keySpec.split("|");
		const created: Binding[] = specs.map((spec) => ({
			keys: spec,
			scope,
			allowInInput,
			preventDefault,
			enabled: true,
			handler,
		}));
		for (const binding of created) bindings.add(binding);
		ensureListener();
		return () => {
			for (const binding of created) bindings.delete(binding);
			removeListenerIfIdle();
		};
	}, [keySpec, handler, scope, enabled, allowInInput, preventDefault]);
}

/**
 * Mark a scope active for the lifetime of the calling component. Lists call
 * `useShortcutScope("list")`; detail panes call `"detail"`. `global` and
 * `modal` are resolved automatically (the latter by observing open Radix
 * dialogs) and need no declaration.
 */
export function useShortcutScope(
	scope: Exclude<ShortcutScope, "global" | "modal">,
	active = true,
): void {
	useEffect(() => {
		if (!active) return;
		activeScopes.add(scope);
		return () => {
			activeScopes.delete(scope);
		};
	}, [scope, active]);
}

/**
 * Test hook: clears all bindings and scope state between test cases.
 * Not part of the public API surface used by app code.
 */
export function __resetKeyboardEngineForTests(): void {
	bindings.clear();
	activeScopes.clear();
	resetSequence();
	removeListenerIfIdle();
}
