import { create } from "zustand";

/**
 * Session-scoped selection state (spec 2.7 / 2.2).
 *
 * Selection is keyed by a scope string (e.g. "cinq:contacts",
 * "vault:products") so it survives navigation within a session and is shared
 * by the bulk-action bar. Cleared on logout via `clearAll()`.
 */
interface SelectionState {
	/** scope -> set of selected entity ids */
	selections: Record<string, Set<string>>;
	/** scope -> whether "select all" is active for the current page */
	selectAll: Record<string, boolean>;

	isSelected: (scope: string, id: string) => boolean;
	toggle: (scope: string, id: string) => void;
	select: (scope: string, id: string) => void;
	deselect: (scope: string, id: string) => void;
	setMany: (scope: string, ids: string[], selected: boolean) => void;
	selectAllFor: (scope: string, ids: string[], active: boolean) => void;
	clear: (scope: string) => void;
	clearAll: () => void;
	getSelected: (scope: string) => string[];
	count: (scope: string) => number;
}

export const useSelectionStore = create<SelectionState>((set, get) => ({
	selections: {},
	selectAll: {},

	isSelected: (scope, id) => !!get().selections[scope]?.has(id),

	toggle: (scope, id) =>
		set((s) => {
			const next = new Set(s.selections[scope] ?? []);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return {
				selections: { ...s.selections, [scope]: next },
				selectAll: { ...s.selectAll, [scope]: false },
			};
		}),

	select: (scope, id) =>
		set((s) => {
			const next = new Set(s.selections[scope] ?? []);
			next.add(id);
			return { selections: { ...s.selections, [scope]: next } };
		}),

	deselect: (scope, id) =>
		set((s) => {
			const next = new Set(s.selections[scope] ?? []);
			next.delete(id);
			return { selections: { ...s.selections, [scope]: next } };
		}),

	setMany: (scope, ids, selected) =>
		set((s) => {
			const next = new Set(s.selections[scope] ?? []);
			for (const id of ids) {
				if (selected) next.add(id);
				else next.delete(id);
			}
			return { selections: { ...s.selections, [scope]: next } };
		}),

	selectAllFor: (scope, ids, active) =>
		set((s) => ({
			selectAll: { ...s.selectAll, [scope]: active },
			selections: {
				...s.selections,
				[scope]: active ? new Set(ids) : new Set(),
			},
		})),

	clear: (scope) =>
		set((s) => {
			const selections = { ...s.selections };
			const selectAll = { ...s.selectAll };
			delete selections[scope];
			delete selectAll[scope];
			return { selections, selectAll };
		}),

	clearAll: () => set({ selections: {}, selectAll: {} }),

	getSelected: (scope) => Array.from(get().selections[scope] ?? []),

	count: (scope) => get().selections[scope]?.size ?? 0,
}));
