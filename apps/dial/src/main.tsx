import "./index.css";
import { I18nProvider } from "@ataqu/shared-i18n";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

import { routeTree } from "./routeTree.gen";

const queryClient = new QueryClient();
const router = createRouter({ routeTree });

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<QueryClientProvider client={queryClient}>
			<I18nProvider>
				<RouterProvider router={router} />
			</I18nProvider>
		</QueryClientProvider>
	</StrictMode>,
);
