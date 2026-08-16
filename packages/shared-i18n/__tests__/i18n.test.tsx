import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { I18nProvider } from "../src/i18n-provider";

describe("I18nProvider", () => {
	it("renders children once the locale loads", async () => {
		render(
			<I18nProvider locale="en">
				<span>loaded</span>
			</I18nProvider>,
		);
		// initially null (not loaded)
		expect(screen.queryByText("loaded")).toBeNull();
		await waitFor(() => expect(screen.getByText("loaded")).toBeTruthy());
	});

	it("handles a missing locale fallback gracefully", async () => {
		render(
			<I18nProvider locale="xx">
				<span>fallback</span>
			</I18nProvider>,
		);
		await waitFor(() => expect(screen.getByText("fallback")).toBeTruthy());
	});
});
