import { i18n } from "@lingui/core";
import { I18nProvider as LinguiProvider } from "@lingui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Shell } from "../src/components/shell";

// Mock CommandPalette to avoid router dependency issues in test
vi.mock("../src/components/command-palette", () => ({
	CommandPalette: () => <div data-testid="command-palette-mock" />,
}));

// Mock auth store to provide a user so sidebar renders
vi.mock("@ataqu/shared-stores", async () => {
	const actual = await vi.importActual("@ataqu/shared-stores");
	return {
		...actual,
		useAuthStore: vi.fn(() => ({
			user: { name: "Test User", email: "test@test.com" },
			token: "fake-token",
			logout: vi.fn(),
		})),
		useUIStore: vi.fn(() => ({
			sidebarOpen: true,
			toggleSidebar: vi.fn(),
		})),
	};
});

i18n.load("en", {});
i18n.activate("en");

const queryClient = new QueryClient({
	defaultOptions: { queries: { retry: false } },
});

const renderWithProviders = (ui: React.ReactElement) => {
	return render(
		<QueryClientProvider client={queryClient}>
			<LinguiProvider i18n={i18n}>{ui}</LinguiProvider>
		</QueryClientProvider>,
	);
};

describe("Shell", () => {
	it("renders children and shows active app", () => {
		renderWithProviders(
			<Shell activeApp="cinq">
				<div>Test Content</div>
			</Shell>,
		);
		expect(screen.getByText("Test Content")).toBeInTheDocument();
		// Check that the sidebar highlights CINQ (the link with text CINQ)
		const links = screen.getAllByRole("link");
		const cinqLink = links.find((l) => l.textContent?.includes("CINQ"));
		expect(cinqLink).toHaveClass("text-amber");
	});
});
