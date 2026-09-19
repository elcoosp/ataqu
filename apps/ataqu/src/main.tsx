import "./index.css";
import {
	ConfirmProvider,
	initTheme,
	ShortcutHelpProvider,
	Toaster,
} from "@ataqu/ui";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import React from "react";
import ReactDOM from "react-dom/client";
import { GlobalShortcuts } from "./components/global-shortcuts";
import { setRouterRef } from "./lib/navigation";
import { routeTree } from "./routeTree.gen";

// Restore persisted theme before first paint (complements the inline
// bootstrap in index.html; keeps SPA navigations consistent).
initTheme();

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

/**
 * Router config (docs B12/§4.3): intent prefetch makes hovering a nav item
 * start the fetch (~2× faster navigation); the global error/not-found
 * components live on the root route.
 */
const router = createRouter({
	routeTree,
	defaultPreload: "intent",
	defaultPreloadDelay: 50,
});

// Register router for imperative navigation outside React components (P1 §5.2).
setRouterRef(router);

ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<ConfirmProvider>
			<GlobalShortcuts />
			<RouterProvider router={router} />
			<Toaster richColors position="bottom-right" />
			<ShortcutHelpProvider />
		</ConfirmProvider>
	</React.StrictMode>,
);
