import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react-swc";
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
		environment: "happy-dom",
		setupFiles: ["./vitest.setup.ts"],
		include: ["**/*.{test,spec}.?(c|m)[jt]s?(x)"],
		exclude: [
			"**/node_modules/**",
			"**/.git/**",
			"**/e2e/**",
			"**/playwright/**",
			"**/*.browser.test.{ts,tsx}",
		],
		coverage: {
			provider: "v8",
			reportsDirectory: "./coverage",
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
				// Thin Radix primitive wrappers: forwardRef consts report as
				// 0% functions under v8 while being fully exercised at the line
				// level. They carry no project business logic, so they are
				// excluded from the coverage gate.
				"**/components/ui/**",
				// Interactive components that only fully exercise in a real
				// browser (recharts canvas, DnD, Radix portals) are validated by
				// the vitest-browser suite (vitest.browser.config.ts), not the
				// happy-dom node run, so they are excluded from the node gate.
				"**/chart.tsx",
				"**/kanban-board.tsx",
				"**/workflow-canvas.tsx",
				"**/onboard-tour.tsx",
			],
			thresholds: {
				lines: 80,
				functions: 80,
				branches: 60,
				statements: 80,
			},
		},
	},
});
