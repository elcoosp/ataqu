import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Local persistence of which changelog entry the user has last seen. The actual
 * changelog content is fetched from the backend (`GET /api/v1/changelog`); this
 * store only records `lastSeenId` so the bell can show a red dot for new entries.
 */
interface ChangelogState {
	lastSeenId: number | null;
	markSeen: (id?: number | null) => void;
}

export const useChangelogStore = create<ChangelogState>()(
	persist(
		(set) => ({
			lastSeenId: null,
			markSeen: (id) => set({ lastSeenId: id ?? null }),
		}),
		{ name: "changelog-storage" },
	),
);
