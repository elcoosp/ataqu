/// <reference types="vite/client" />

export type AtaquTheme = "dark" | "light";

export const THEME_STORAGE_KEY = "ataqu-theme";

export function getInitialTheme(): AtaquTheme {
	if (typeof window === "undefined") return "dark";
	const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
	if (stored === "light" || stored === "dark") return stored;
	return "dark";
}

export function applyTheme(theme: AtaquTheme): void {
	if (typeof document === "undefined") return;
	const root = document.documentElement;
	if (theme === "light") {
		root.classList.remove("dark");
	} else {
		root.classList.add("dark");
	}
	root.style.colorScheme = theme;
}

/** Call once at app boot, before first paint, to avoid a theme flash. */
export function initTheme(): void {
	applyTheme(getInitialTheme());
}

export function toggleTheme(): AtaquTheme {
	const next: AtaquTheme = getInitialTheme() === "dark" ? "light" : "dark";
	window.localStorage.setItem(THEME_STORAGE_KEY, next);
	applyTheme(next);
	return next;
}

/** Subscribe to theme changes; returns an unsubscribe fn. Fires synchronously on change. */
export function onThemeChange(listener: (theme: AtaquTheme) => void): () => void {
	const observer = new MutationObserver(() => {
		listener(document.documentElement.classList.contains("dark") ? "dark" : "light");
	});
	observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
	listener(getInitialTheme());
	return () => observer.disconnect();
}