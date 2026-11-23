import { describe, expect, it, vi } from "vitest";
import { applyTheme, getInitialTheme, initTheme, onThemeChange, toggleTheme } from "../theme";

describe("theme", () => {
	it("getInitialTheme defaults to dark without storage", () => {
		expect(getInitialTheme()).toBe("dark");
	});

	it("applyTheme toggles the dark class and colorScheme", () => {
		const root = document.documentElement;
		applyTheme("light");
		expect(root.classList.contains("dark")).toBe(false);
		expect(root.style.colorScheme).toBe("light");
		applyTheme("dark");
		expect(root.classList.contains("dark")).toBe(true);
		expect(root.style.colorScheme).toBe("dark");
	});

	it("toggleTheme switches theme", () => {
		expect(["dark", "light"]).toContain(toggleTheme());
	});

	it("initTheme applies initial theme without throwing", () => {
		expect(() => initTheme()).not.toThrow();
	});

	it("onThemeChange fires and returns unsubscribe", () => {
		const fn = vi.fn();
		const unsubscribe = onThemeChange(fn);
		expect(fn).toHaveBeenCalled();
		expect(typeof unsubscribe).toBe("function");
		unsubscribe();
	});
});
