import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react-swc";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	plugins: [
		react({
			plugins: [["@lingui/swc-plugin", {}]],
		}),
	],
	resolve: {
		dedupe: ["react", "react-dom", "@lingui/core", "@lingui/react"],
		alias: {
			react: path.resolve(__dirname, "node_modules/react"),
			"react-dom": path.resolve(__dirname, "node_modules/react-dom"),
			"react/jsx-dev-runtime": path.resolve(
				__dirname,
				"node_modules/react/jsx-dev-runtime.js",
			),
			"react/jsx-runtime": path.resolve(
				__dirname,
				"node_modules/react/jsx-runtime.js",
			),
			"@lingui/core": path.resolve(__dirname, "node_modules/@lingui/core"),
			"@lingui/react": path.resolve(__dirname, "node_modules/@lingui/react"),
			"@ataqu/shared-i18n": path.resolve(
				__dirname,
				"packages/shared-i18n/src/index",
			),
			"@ataqu/shared-utils": path.resolve(
				__dirname,
				"packages/shared-utils/src/index",
			),
			"@ataqu/shared-hooks": path.resolve(
				__dirname,
				"packages/shared-hooks/src/index",
			),
			"@ataqu/shared-stores": path.resolve(
				__dirname,
				"packages/shared-stores/src/index",
			),
			"@ataqu/types": path.resolve(__dirname, "packages/types/src/index"),
			"@ataqu/api-client": path.resolve(
				__dirname,
				"packages/api-client/src/index",
			),
			"@ataqu/ui": path.resolve(__dirname, "packages/ui/src/index"),
		},
	},
	optimizeDeps: {
		include: [
			"react",
			"react-dom",
			"react/jsx-dev-runtime",
			"react/jsx-runtime",
		],
	},
	test: {
		globals: true,
		setupFiles: ["./vitest.setup.ts"],
		include: ["**/*.browser.test.{ts,tsx}"],
		exclude: ["**/node_modules/**", "**/.git/**", "**/e2e/**"],
		browser: {
			enabled: true,
			provider: playwright(),
			headless: true,
			instances: [{ browser: "chromium" }],
			launchOptions: {
				executablePath:
					"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
				args: [
					"--no-sandbox",
					"--disable-setuid-sandbox",
					"--disable-dev-shm-usage",
				],
			},
		},
		coverage: {
			provider: "v8",
			reportsDirectory: "./coverage-browser",
			reporter: ["text", "html", "clover"],
			include: ["packages/*/src/**/*.{ts,tsx}"],
			exclude: [
				"**/node_modules/**",
				"**/.git/**",
				"**/e2e/**",
				"**/playwright/**",
				"**/*.test.{ts,tsx}",
				"**/*.spec.{ts,tsx}",
				"**/__tests__/**",
				"**/*.config.*",
				"**/*.d.ts",
				"**/src/index.ts",
				"**/vite-env.d.ts",
			],
		},
	},
});
