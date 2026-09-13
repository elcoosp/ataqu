import { I18nProvider } from "@ataqu/shared-i18n";
import { OnboardTour, Shell } from "@ataqu/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRootRoute, Outlet, useLocation } from "@tanstack/react-router";
import { AegisCommandRegistrar } from "../actions";
import { CinqCommandRegistrar } from "../apps/cinq/actions";
import { DialCommandRegistrar } from "../apps/dial/actions";
import { PauseCommandRegistrar } from "../apps/pause/actions";
import { PivotCommandRegistrar } from "../apps/pivot/actions";
import { SondCommandRegistrar } from "../apps/sond/actions";
import { SparkCommandRegistrar } from "../apps/spark/actions";
import { TempoCommandRegistrar } from "../apps/tempo/actions";
import { VaultCommandRegistrar } from "../apps/vault/actions";
import { VistaCommandRegistrar } from "../apps/vista/actions";
import { useDialWebSocket } from "../apps/dial/hooks/use-dial-websocket";

const queryClient = new QueryClient();

/** Keeps the DIAL live WebSocket connected (was mounted in DIAL's old _auth). */
function DialLive() {
	useDialWebSocket();
	return null;
}

function activeAppFor(pathname: string): string {
	const seg = pathname.split("/").filter(Boolean)[0] ?? "";
	if (
		seg === "cinq" || seg === "dial" || seg === "pivot" ||
		seg === "spark" || seg === "tempo" || seg === "sond" ||
		seg === "vault" || seg === "pause" || seg === "vista"
	) return seg;
	return "aegis";
}

export const Route = createRootRoute({
	component: () => {
		let pathname = "/";
		try {
			pathname = useLocation({ select: (s) => s.pathname });
		} catch { pathname = "/"; }
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
