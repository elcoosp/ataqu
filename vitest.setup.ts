import "@testing-library/jest-dom/vitest";
import { i18n } from "@lingui/core";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Activate Lingui locale and load empty messages to prevent stderr warnings
i18n.load("en", {});
i18n.activate("en");

window.matchMedia =
	window.matchMedia ||
	vi.fn().mockImplementation((query: string) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(),
		removeListener: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	}));

class ResizeObserverMock {
	observe() {}
	unobserve() {}
	disconnect() {}
}
window.ResizeObserver = window.ResizeObserver || ResizeObserverMock;

class IntersectionObserverMock {
	observe() {}
	unobserve() {}
	disconnect() {}
}
window.IntersectionObserver =
	window.IntersectionObserver || IntersectionObserverMock;

// happy-dom does not expose localStorage unless --localstorage-file is set.
// Provide an in-memory store so zustand persist + theme code work in every env.
const localStorageStore = (() => {
	let store: Record<string, string> = {};
	return {
		get length() {
			return Object.keys(store).length;
		},
		getItem: (key: string) => (key in store ? store[key] : null),
		setItem: (key: string, value: string) => {
			store[key] = String(value);
		},
		removeItem: (key: string) => {
			delete store[key];
		},
		clear: () => {
			store = {};
		},
		key: (index: number) => Object.keys(store)[index] ?? null,
	};
})();

if (typeof window !== "undefined" && !window.localStorage) {
	Object.defineProperty(window, "localStorage", {
		value: localStorageStore,
		configurable: true,
	});
}

afterEach(() => {
	cleanup();
});
