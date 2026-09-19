/**
 * Keyboard shortcut registry (brainstorm P2-3).
 *
 * One source of truth consumed by BOTH the event matcher and the `?` help
 * overlay, so a tooltip can never advertise a shortcut that has no handler
 * (the "fake chrome" bug this replaces).
 *
 * Key notation
 * ------------
 *  - `mod`  → ⌘ on Apple platforms, Ctrl elsewhere
 *  - `mod+k` → chord with a modifier
 *  - `g d`  → a two-key SEQUENCE (press g, then d, within `SEQUENCE_TIMEOUT_MS`)
 *  - `?`    → the literal character (shift+/ on US layouts)
 */

export type ShortcutScope = "global" | "list" | "detail" | "modal";

export interface ShortcutDef {
	id: string;
	/** Machine-readable key spec, e.g. `mod+k`, `g d`, `?`. */
	keys: string;
	/** Human label rendered in the help overlay. */
	label: string;
	/** Overlay grouping. */
	group: ShortcutGroup;
	/** Which surface must be active for this shortcut to fire. */
	scope: ShortcutScope;
}

export const SHORTCUT_GROUPS = [
	"General",
	"Navigation",
	"Selection",
	"Editing",
] as const;

export type ShortcutGroup = (typeof SHORTCUT_GROUPS)[number];

/** Per-app "go to" targets reachable with `g` + letter. */
export const GO_TO_TARGETS: Record<string, string> = {
	d: "Dashboard",
	c: "CINQ",
	i: "DIAL",
	p: "PIVOT",
	s: "SPARK",
	t: "TEMPO",
	o: "SOND",
	v: "VAULT",
	a: "PAUSE",
	r: "VISTA",
};

export const SHORTCUTS: ShortcutDef[] = [
	{
		id: "palette",
		keys: "mod+k",
		label: "Open command palette",
		group: "General",
		scope: "global",
	},
	{
		id: "help",
		keys: "?",
		label: "Show keyboard shortcuts",
		group: "General",
		scope: "global",
	},
	{
		id: "create",
		keys: "c",
		label: "Create in current app",
		group: "General",
		scope: "global",
	},
	{
		id: "search",
		keys: "/",
		label: "Focus search",
		group: "Navigation",
		scope: "list",
	},
	{
		id: "go-dashboard",
		keys: "g d",
		label: "Go to dashboard",
		group: "Navigation",
		scope: "global",
	},
	{
		id: "next-row",
		keys: "j",
		label: "Next row",
		group: "Navigation",
		scope: "list",
	},
	{
		id: "prev-row",
		keys: "k",
		label: "Previous row",
		group: "Navigation",
		scope: "list",
	},
	{
		id: "open-row",
		keys: "enter",
		label: "Open focused row",
		group: "Selection",
		scope: "list",
	},
	{
		id: "toggle-select",
		keys: "x",
		label: "Toggle row selection",
		group: "Selection",
		scope: "list",
	},
	{
		id: "select-all",
		keys: "mod+a",
		label: "Select all rows",
		group: "Selection",
		scope: "list",
	},
	{
		id: "edit",
		keys: "e",
		label: "Edit focused record",
		group: "Editing",
		scope: "detail",
	},
	{
		id: "delete",
		keys: "backspace",
		label: "Delete focused record (with undo)",
		group: "Editing",
		scope: "list",
	},
	{
		id: "submit",
		keys: "mod+enter",
		label: "Submit dialog",
		group: "Editing",
		scope: "modal",
	},
	{
		id: "close",
		keys: "escape",
		label: "Close overlay",
		group: "Editing",
		scope: "modal",
	},
];

/** Milliseconds allowed between the keys of a sequence chord. */
export const SEQUENCE_TIMEOUT_MS = 900;

const NAMED_KEYS = new Set([
	"enter",
	"escape",
	"backspace",
	"delete",
	"tab",
	"arrowup",
	"arrowdown",
	"arrowleft",
	"arrowright",
	"home",
	"end",
	"pageup",
	"pagedown",
	"space",
]);

export const isApplePlatform = (): boolean => {
	if (typeof navigator === "undefined") return false;
	const platform =
		(navigator as Navigator & { userAgentData?: { platform?: string } })
			.userAgentData?.platform ??
		navigator.platform ??
		navigator.userAgent ??
		"";
	return /mac|iphone|ipad|ipod/i.test(platform);
};

/**
 * Converts a keydown event into the canonical token used by `SHORTCUTS.keys`.
 * Returns `null` for bare modifier presses, which are not shortcuts.
 *
 * Shift is folded into the character for printable keys (`?` arrives as
 * `shift+/` but must match `?`), so shift is only emitted for named keys.
 */
export function eventToToken(event: KeyboardEvent): string | null {
	const { key } = event;
	if (key === "Meta" || key === "Control" || key === "Alt" || key === "Shift") {
		return null;
	}
	const mods: string[] = [];
	if (event.metaKey || event.ctrlKey) mods.push("mod");
	if (event.altKey) mods.push("alt");

	let base = key.length === 1 && key === " " ? "space" : key.toLowerCase();
	if (base === " " || base === "spacebar") base = "space";
	if (NAMED_KEYS.has(base) && event.shiftKey) mods.push("shift");

	return [...mods, base].join("+");
}

/** Renders a key spec for display: `mod+k` → `⌘K` (Apple) / `Ctrl+K`. */
export function formatShortcut(keys: string): string {
	return keys
		.split(" ")
		.map((chord) =>
			chord
				.split("+")
				.map((part) => {
					if (part === "mod") return isApplePlatform() ? "⌘" : "Ctrl";
					if (part === "alt") return isApplePlatform() ? "⌥" : "Alt";
					if (part === "shift") return "⇧";
					if (part === "enter") return "⏎";
					if (part === "escape") return "Esc";
					if (part === "backspace") return "⌫";
					if (part === "space") return "Space";
					return part.length === 1 ? part.toUpperCase() : part;
				})
				.join(isApplePlatform() ? "" : "+"),
		)
		.join(" ");
}

/** True when the event originated in a text-entry surface. */
export function isEditableTarget(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) return false;
	const tag = target.tagName;
	if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
	return target.isContentEditable;
}

/** Look up a registry entry by id (used by tooltips). */
export function findShortcut(id: string): ShortcutDef | undefined {
	return SHORTCUTS.find((s) => s.id === id);
}

/** Convenience: the display form of a registered shortcut id. */
export function shortcutLabel(id: string): string | undefined {
	const def = findShortcut(id);
	return def ? formatShortcut(def.keys) : undefined;
}