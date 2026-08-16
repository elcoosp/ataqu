import { beforeEach, describe, expect, it } from "vitest";
import { useActivationStore } from "../src/activation";
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

	it("reports full unread count before marking seen", () => {
		expect(useChangelogStore.getState().unreadCount()).toBeGreaterThan(0);
	});

	it("markSeen sets lastSeenId to the latest entry", () => {
		useChangelogStore.getState().markSeen();
		expect(useChangelogStore.getState().lastSeenId).toBeTruthy();
		expect(useChangelogStore.getState().unreadCount()).toBe(0);
	});
});

describe("useActivationStore", () => {
	beforeEach(() =>
		useActivationStore.setState({
			completed: {},
		}),
	);

	it("has a positive total", () => {
		expect(useActivationStore.getState().total).toBeGreaterThan(0);
	});

	it("marks and resets completion", () => {
		useActivationStore.getState().complete("import-contacts");
		expect(useActivationStore.getState().isComplete("import-contacts")).toBe(
			true,
		);
		expect(useActivationStore.getState().completedCount()).toBe(1);
		useActivationStore.getState().reset("import-contacts");
		expect(useActivationStore.getState().isComplete("import-contacts")).toBe(
			false,
		);
	});

	it("progress increases as tasks complete", () => {
		const total = useActivationStore.getState().total;
		useActivationStore.getState().complete("import-contacts");
		expect(useActivationStore.getState().progress()).toBe(
			Math.round((1 / total) * 100),
		);
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
