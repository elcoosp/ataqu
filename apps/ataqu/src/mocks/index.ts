/**
 * Mock-mode entrypoint.
 *
 * The mock layer is enabled when:
 *   - `import.meta.env.VITE_ENABLE_MOCKS` is not explicitly "false", AND
 *   - the environment is a dev/preview build (never a production deployment
 *     unless an operator opts in — see ATAQU_BLUEPRINT.md → "Modes").
 *
 * Enablement happens before `main.tsx` renders React: every TanStack Query
 * fired by the app is then served by MSW from the seeded database.
 */
export async function enableMocking(): Promise<void> {
	const flag = import.meta.env.VITE_ENABLE_MOCKS as string | undefined;
	if (flag === "false" || flag === "0") return;

	const { worker } = await import("./browser");
	const { seed } = await import("./seed");
	seed();

	await worker.start({
		// Quiet by default — set `localStorage.setItem('msw-quiet','false')`
		// to debug handlers in the console.
		quiet: true,
		// The worker script lives at the origin root (served from the shared
		// publicDir). Keep the default location.
		serviceWorker: { url: "/mockServiceWorker.js" },
	});
}
