import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ChangelogCategory = "New" | "Improved" | "Fixed";

export interface ChangelogEntry {
	id: string;
	date: string;
	title: string;
	description: string;
	category: ChangelogCategory;
	breaking?: boolean;
}

/** Seed changelog. In production this would come from a backend table. */
export const CHANGELOG: ChangelogEntry[] = [
	{
		id: "2026-08-16-unified-search",
		date: "2026-08-16",
		title: "Unified Search across all 10 apps",
		description:
			"Press ⌘K anywhere to search contacts, deals, products, tickets and more in one place.",
		category: "New",
	},
	{
		id: "2026-08-16-health",
		date: "2026-08-16",
		title: "System Health & observability",
		description:
			"Live health badge in the Shell plus a full VISTA health dashboard with outbox lag and DLQ depth.",
		category: "New",
	},
	{
		id: "2026-08-16-bulk",
		date: "2026-08-16",
		title: "Bulk actions & selection persistence",
		description:
			"Select rows across CINQ, VAULT and SOND and keep your selection as you navigate.",
		category: "Improved",
	},
];

interface ChangelogState {
	lastSeenId: string | null;
	markSeen: () => void;
	unreadCount: () => number;
}

export const useChangelogStore = create<ChangelogState>()(
	persist(
		(set, get) => ({
			lastSeenId: null,
			markSeen: () => set({ lastSeenId: CHANGELOG[0]?.id ?? null }),
			unreadCount: () => {
				const idx = CHANGELOG.findIndex((e) => e.id === get().lastSeenId);
				if (idx < 0) return CHANGELOG.length;
				return idx;
			},
		}),
		{ name: "changelog-storage" },
	),
);
