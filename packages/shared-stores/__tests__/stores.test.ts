import { beforeEach, describe, expect, it } from "vitest";
import { ACTIVATION_TASKS, activationTaskHref } from "../src/activation";
import { useAuthStore } from "../src/auth";
import { useChangelogStore } from "../src/changelog";
import { useOnboardingStore } from "../src/onboarding";
import { useSelectionStore } from "../src/selection";
import { useUIStore } from "../src/ui";

const _reset = (store: { setState: (s: any) => void }, initial: any) =>
	store.setState(initial);

describe("useAuthStore", () => {
	beforeEach(() =>
		useAuthStore.setState({ token: null, user: null, tenantId: null }),
	);

	it("logs in and stores token/user/tenant", () => {
		useAuthStore.getState().login("tok", {
			id: "u1",
			email: "a@b.com",
			tenantId: "t1",
			roles: ["admin"],
		});
		const s = useAuthStore.getState();
		expect(s.token).toBe("tok");
		expect(s.user?.email).toBe("a@b.com");
		expect(s.tenantId).toBe("t1");
	});

	it("logs out and clears state", () => {
		useAuthStore.getState().login("tok", {
			id: "u1",
			email: "a@b.com",
			tenantId: "t1",
			roles: [],
		});
		useAuthStore.getState().logout();
		const s = useAuthStore.getState();
		expect(s.token).toBeNull();
		expect(s.user).toBeNull();
		expect(s.tenantId).toBeNull();
	});
});

describe("useSelectionStore", () => {
	beforeEach(() =>
		useSelectionStore.setState({
			selections: {},
			selectAll: {},
		}),
	);

	it("toggles selection", () => {
		const s = useSelectionStore.getState();
		s.toggle("scope", "a");
		expect(useSelectionStore.getState().isSelected("scope", "a")).toBe(true);
		s.toggle("scope", "a");
		expect(useSelectionStore.getState().isSelected("scope", "a")).toBe(false);
	});

	it("selects and deselects", () => {
		const s = useSelectionStore.getState();
		s.select("s", "a");
		s.select("s", "b");
		expect(useSelectionStore.getState().count("s")).toBe(2);
		s.deselect("s", "a");
		expect(useSelectionStore.getState().count("s")).toBe(1);
	});

	it("setMany sets/clears for a list", () => {
		const s = useSelectionStore.getState();
		s.setMany("s", ["a", "b", "c"], true);
		expect(useSelectionStore.getState().count("s")).toBe(3);
		s.setMany("s", ["a", "c"], false);
		expect(useSelectionStore.getState().getSelected("s")).toEqual(["b"]);
	});

	it("selectAllFor activates all or none", () => {
		const s = useSelectionStore.getState();
		s.selectAllFor("s", ["a", "b"], true);
		expect(useSelectionStore.getState().count("s")).toBe(2);
		s.selectAllFor("s", ["a", "b"], false);
		expect(useSelectionStore.getState().count("s")).toBe(0);
	});

	it("toggle disables selectAll", () => {
		const s = useSelectionStore.getState();
		s.selectAllFor("s", ["a"], true);
		s.toggle("s", "a");
		expect(useSelectionStore.getState().selectAll.s).toBe(false);
	});

	it("clear removes a scope", () => {
		const s = useSelectionStore.getState();
		s.select("s", "a");
		s.clear("s");
		expect(useSelectionStore.getState().selections.s).toBeUndefined();
	});

	it("clearAll resets everything", () => {
		const s = useSelectionStore.getState();
		s.select("a", "1");
		s.select("b", "2");
		s.clearAll();
		expect(useSelectionStore.getState().selections).toEqual({});
	});
});

describe("useChangelogStore", () => {
	beforeEach(() => useChangelogStore.setState({ lastSeenId: null }));

	it("starts with no lastSeenId", () => {
		expect(useChangelogStore.getState().lastSeenId).toBeNull();
	});

	it("markSeen records the newest entry id", () => {
		useChangelogStore.getState().markSeen("2026-08-16-unified-search");
		expect(useChangelogStore.getState().lastSeenId).toBe(
			"2026-08-16-unified-search",
		);
	});
});

describe("ACTIVATION_TASKS", () => {
	it("has a positive number of activation tasks", () => {
		expect(ACTIVATION_TASKS.length).toBeGreaterThan(0);
	});

	it("exposes a deep link for each task", () => {
		for (const task of ACTIVATION_TASKS) {
			expect(task.href).toBeTruthy();
		}
	});
});

describe("activationTaskHref", () => {
	it("returns the href for a known task id", () => {
		for (const task of ACTIVATION_TASKS) {
			expect(activationTaskHref(task.id)).toBe(task.href);
		}
	});
	it("returns undefined for an unknown id", () => {
		expect(activationTaskHref("does-not-exist")).toBeUndefined();
	});
});

describe("useOnboardingStore", () => {
	beforeEach(() => useOnboardingStore.setState({ completedTours: {} }));

	it("starts incomplete", () => {
		expect(useOnboardingStore.getState().isCompleted("tour1")).toBe(false);
	});
	it("marks a tour completed", () => {
		useOnboardingStore.getState().markCompleted("tour1");
		expect(useOnboardingStore.getState().isCompleted("tour1")).toBe(true);
	});
});

describe("useUIStore", () => {
	beforeEach(() =>
		useUIStore.setState({
			sidebarOpen: true,
			focusMode: false,
			theme: "dark",
		}),
	);

	it("toggles sidebar", () => {
		useUIStore.getState().toggleSidebar();
		expect(useUIStore.getState().sidebarOpen).toBe(false);
	});
	it("sets focus mode", () => {
		useUIStore.getState().setFocusMode(true);
		expect(useUIStore.getState().focusMode).toBe(true);
	});
	it("sets theme", () => {
		useUIStore.getState().setTheme("light");
		expect(useUIStore.getState().theme).toBe("light");
	});
});
