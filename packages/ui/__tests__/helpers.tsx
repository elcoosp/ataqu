import { setupI18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	createMemoryHistory,
	createRootRoute,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import { vi } from "vitest";

export function makeI18n() {
	const li = setupI18n("en");
	li.load("en", {});
	li.activate("en");
	return li;
}

export function Providers({ children }: { children: ReactNode }) {
	const li = makeI18n();
	const qc = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	return (
		<I18nProvider i18n={li}>
			<QueryClientProvider client={qc}>{children}</QueryClientProvider>
		</I18nProvider>
	);
}

export function WithRouter({ children }: { children: ReactNode }) {
	const inner = <Providers>{children}</Providers>;
	const router = createRouter({
		history: createMemoryHistory({ initialEntries: ["/"] }),
		routeTree: createRootRoute({ component: () => inner }),
	});
	return <RouterProvider router={router} />;
}

export function jsonResponse(body: unknown) {
	return {
		ok: true,
		status: 200,
		json: async () => body,
		text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
		blob: async () => new Blob(),
		arrayBuffer: async () => new ArrayBuffer(0),
	} as Response;
}

export function stubFetch(body: unknown = { ok: true, status: 200 }) {
	const impl = vi.fn().mockResolvedValue(jsonResponse(body));
	vi.stubGlobal("fetch", impl);
	return impl;
}