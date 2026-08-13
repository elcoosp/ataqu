import { i18n } from "@lingui/core";
import { I18nProvider as LinguiProvider } from "@lingui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type React from "react";

i18n.load("en", {});
i18n.activate("en");

const queryClient = new QueryClient({
	defaultOptions: { queries: { retry: false } },
});
export const renderWithProviders = (ui: React.ReactElement, options = {}) =>
	render(
		<QueryClientProvider client={queryClient}>
			<LinguiProvider i18n={i18n}>{ui}</LinguiProvider>
		</QueryClientProvider>,
		options,
	);
