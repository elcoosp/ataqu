import { I18nProvider } from "@ataqu/shared-i18n";
import { OnboardTour, Shell } from "@ataqu/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { AegisCommandRegistrar } from "../actions";

const queryClient = new QueryClient();

export const Route = createRootRoute({
	component: () => (
		<QueryClientProvider client={queryClient}>
			<I18nProvider>
				<OnboardTour
					tourId="default"
					steps={[
						{
							selector: "body",
							content:
								"Welcome to Ataqu SSO. Use the sidebar to switch between all your workspace apps.",
						},
						{
							selector: "body",
							content:
								"Manage users, roles and API keys from the admin section on the left.",
						},
						{
							selector: "body",
							content:
								"Press ⌘K anywhere to search across every app or run a command.",
						},
					]}
				>
					<Shell activeApp="aegis">
						<AegisCommandRegistrar />
						<Outlet />
					</Shell>
				</OnboardTour>
			</I18nProvider>
		</QueryClientProvider>
	),
});
