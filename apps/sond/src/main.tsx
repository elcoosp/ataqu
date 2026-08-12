import { I18nProvider } from "@ataqu/shared-i18n";
import { Toaster } from "@ataqu/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import React from "react";
import ReactDOM from "react-dom/client";
import { routeTree } from "./routeTree.gen";
import "./index.css";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 },
	},
});

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

const rootEl = document.getElementById("root");
if (rootEl) {
	ReactDOM.createRoot(rootEl).render(
		<React.StrictMode>
			<QueryClientProvider client={queryClient}>
				<I18nProvider>
					<RouterProvider router={router} />
					<Toaster position="bottom-right" richColors closeButton />
				</I18nProvider>
			</QueryClientProvider>
		</React.StrictMode>,
	);
}
