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

afterEach(() => {
	cleanup();
});
