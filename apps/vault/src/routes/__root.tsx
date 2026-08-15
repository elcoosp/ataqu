import { I18nProvider } from "@ataqu/shared-i18n";
import { OnboardTour, Shell } from "@ataqu/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { VaultCommandRegistrar } from "@/actions";

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
								"Welcome to VAULT. Track products, variants, stock movements and reservations.",
						},
						{
							selector: "body",
							content:
								"Set low-stock alerts on a product to stay ahead of shortages.",
						},
						{
							selector: "body",
							content: "Press ⌘K to jump to VAULT commands.",
						},
					]}
				>
					<Shell activeApp="vault">
						<VaultCommandRegistrar />
						<Outlet />
					</Shell>
				</OnboardTour>
			</I18nProvider>
		</QueryClientProvider>
	),
});
