import { I18nProvider } from "@ataqu/shared-i18n";
import { OnboardTour, Shell } from "@ataqu/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { PivotCommandRegistrar } from "../actions";

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
								"Welcome to PIVOT. Build documents and databases, and save reusable templates.",
						},
						{
							selector: "body",
							content:
								"Open version history on any document to review and restore earlier edits.",
						},
						{
							selector: "body",
							content: "Press ⌘K to jump to PIVOT commands.",
						},
					]}
				>
					<Shell activeApp="pivot">
						<PivotCommandRegistrar />
						<Outlet />
					</Shell>
				</OnboardTour>
			</I18nProvider>
		</QueryClientProvider>
	),
});
