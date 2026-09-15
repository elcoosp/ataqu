import { mergeConfig } from "vitest/config";
import { defineConfig } from "vitest/config";
import baseConfig from "./vite.config";

/**
 * Vitest runs only unit tests; Playwright owns the e2e/ directory
 * (see the root playwright.config.ts). Merge the app's vite config so
 * plugins (Lingui SWC macro, TanStack router, Tailwind) apply to tests.
 */
export default mergeConfig(
	baseConfig,
	defineConfig({
		test: {
			exclude: ["**/node_modules/**", "**/dist/**", "**/e2e/**"],
		},
	}),
);
