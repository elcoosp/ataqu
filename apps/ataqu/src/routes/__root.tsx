import { I18nProvider } from "@ataqu/shared-i18n";
import { OnboardTour, Shell } from "@ataqu/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	createRootRoute,
	Link,
	Outlet,
	useLocation,
} from "@tanstack/react-router";
import { AegisCommandRegistrar } from "../actions";
import { CinqCommandRegistrar } from "../apps/cinq/actions";
import { DialCommandRegistrar } from "../apps/dial/actions";
import { useDialWebSocket } from "../apps/dial/hooks/use-dial-websocket";
import { PauseCommandRegistrar } from "../apps/pause/actions";
import { PivotCommandRegistrar } from "../apps/pivot/actions";
import { SondCommandRegistrar } from "../apps/sond/actions";
import { SparkCommandRegistrar } from "../apps/spark/actions";
import { TempoCommandRegistrar } from "../apps/tempo/actions";
import { VaultCommandRegistrar } from "../apps/vault/actions";
import { VistaCommandRegistrar } from "../apps/vista/actions";

/**
 * Suite-wide react-query defaults (docs §4.3): staleTime kills the refetch
 * storm on navigation; retry only on 5xx/network, never on 4xx (409/412
 * conflicts and 422 validation must surface immediately).
 */
const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 30_000,
			refetchOnWindowFocus: true,
			retry: (failureCount, error) => {
				const status =
					typeof error === "object" && error !== null && "status" in error
						? Number((error as { status?: number }).status)
						: undefined;
				if (status !== undefined && status >= 400 && status < 500) return false;
				return failureCount < 2;
			},
		},
		mutations: {
			retry: false,
		},
	},
});

/** Keeps the DIAL live WebSocket connected (was mounted in DIAL's old _auth). */
function DialLive() {
	useDialWebSocket();
	return null;
}

function activeAppFor(pathname: string): string {
	const seg = pathname.split("/").filter(Boolean)[0] ?? "";
	if (
		seg === "cinq" ||
		seg === "dial" ||
		seg === "pivot" ||
		seg === "spark" ||
		seg === "tempo" ||
		seg === "sond" ||
		seg === "vault" ||
		seg === "pause" ||
		seg === "vista"
	)
		return seg;
	return "aegis";
}

/** Route-level error boundary (docs B12 — suite had none outside tempo). */
function ErrorComponent({ error }: { error: Error }) {
	return (
		<div className="flex h-[60vh] flex-col items-center justify-center gap-3 p-8 text-center">
			<h1 className="text-lg font-semibold">Something went wrong</h1>
			<p className="max-w-md text-sm text-muted-foreground">
				{error?.message ?? "An unexpected error occurred."}
			</p>
			<button
				type="button"
				className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
				onClick={() => window.location.reload()}
			>
				Reload
			</button>
		</div>
	);
}

/** Suite-wide 404 (docs B12 — was a bare div). */
function NotFoundComponent() {
	return (
		<div className="flex h-[60vh] flex-col items-center justify-center gap-3 p-8 text-center">
			<h1 className="text-2xl font-semibold tracking-tight">404</h1>
			<p className="text-sm text-muted-foreground">
				This page does not exist or has been moved.
			</p>
			<Link
				to="/"
				className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
			>
				Back to dashboard
			</Link>
		</div>
	);
}

export const Route = createRootRoute({
	errorComponent: ErrorComponent,
	notFoundComponent: NotFoundComponent,
	component: () => {
		let pathname = "/";
		try {
			pathname = useLocation({ select: (s) => s.pathname });
		} catch {
			pathname = "/";
		}
		return (
			<QueryClientProvider client={queryClient}>
				<DialLive />
				<I18nProvider>
					<OnboardTour
						tourId="default"
						steps={[
							{
								selector: "body",
								content:
									"Welcome to Ataqu. Use the sidebar to switch between all your workspace apps.",
							},
							{
								selector: "body",
								content:
									"Press \u2318K anywhere to search across every app or run a command.",
							},
						]}
					>
						<Shell activeApp={activeAppFor(pathname)}>
							<AegisCommandRegistrar />
							<CinqCommandRegistrar />
							<DialCommandRegistrar />
							<PauseCommandRegistrar />
							<PivotCommandRegistrar />
							<SondCommandRegistrar />
							<SparkCommandRegistrar />
							<TempoCommandRegistrar />
							<VaultCommandRegistrar />
							<VistaCommandRegistrar />
							<Outlet />
						</Shell>
					</OnboardTour>
				</I18nProvider>
			</QueryClientProvider>
		);
	},
});
