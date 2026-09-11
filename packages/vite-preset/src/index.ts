import path from "node:path";
import { fileURLToPath } from "node:url";
import { linguiMacroSwcPlugin } from "@lingui/swc-plugin/options";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react-swc";
import { boneyardPlugin } from "boneyard-js/vite";
import { defineConfig, type UserConfig } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const APP_PORTS: Record<string, number> = {
	aegis: 5173,
	cinq: 5174,
	dial: 5175,
	pivot: 5176,
	spark: 5177,
	tempo: 5178,
	sond: 5179,
	vault: 5180,
	pause: 5181,
	vista: 5182,
};

export const defineViteConfig = (options: { appName: string }): UserConfig => {
	const rootDir = path.resolve(__dirname, "../../../");
	const packagesDir = path.resolve(rootDir, "packages");

	return defineConfig({
		plugins: [
			tanstackRouter({
				target: "react",
				autoCodeSplitting: true,
				routesDirectory: "./src/routes",
				generatedRouteTree: "./src/routeTree.gen.ts",
			}),
			react({
				plugins: [linguiMacroSwcPlugin()],
			}),
			tailwindcss(), // <-- Ensure this is present
			boneyardPlugin(),
		],
		resolve: {
			tsconfigPaths: true,
			dedupe: [
				"react",
				"react-dom",
				"@tanstack/react-router",
				"@tanstack/react-query",
				"@tanstack/history",
			],
		},
		publicDir: path.resolve(packagesDir, "shared-assets/public"),
		server: {
			port: APP_PORTS[options.appName] || 5173,
			strictPort: true,
			proxy: {
				"/api": "http://localhost:3000",
				"/ws": { target: "ws://localhost:3000", ws: true },
			},
		},
		preview: {
			port: APP_PORTS[options.appName] || 5173,
			strictPort: true,
			proxy: {
				"/api": "http://localhost:3000",
				"/ws": { target: "ws://localhost:3000", ws: true },
			},
		},
		build: {
			chunkSizeWarningLimit: 1000,
			target: "es2024",
			minify: "esbuild",
			sourcemap: true,
		},
	});
};
