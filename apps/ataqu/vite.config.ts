import { defineConfig, type UserConfig } from "vite";
import { defineViteConfig } from "@ataqu/vite-preset";
import { dialWsMockPlugin } from "./src/mocks/vite/dial-ws-mock.ts";

/**
 * App config = the shared @ataqu/vite-preset (TanStack Router codegen, SWC +
 * Lingui macros, Tailwind 4, shared publicDir, /api + /ws proxying) plus:
 *
 * 1. the mock DIAL WebSocket server plugin (end-to-end chat in mock mode), and
 * 2. a dedicated, most-specific-first proxy rule routing `ws://…/api/dial/ws`
 *    to that in-process mock server on :5174 (the generic `/api` proxy rule
 *    would otherwise swallow the upgrade and try the Rust backend).
 */
const base: UserConfig = defineViteConfig({ appName: "ataqu" });

export default defineConfig({
        ...base,
        plugins: [...(base.plugins ?? []), dialWsMockPlugin()],
        server: {
                ...base.server,
                proxy: {
                        "/api/dial/ws": { target: "ws://127.0.0.1:5174", ws: true },
                        ...(base.server?.proxy ?? {}),
                },
        },
});
