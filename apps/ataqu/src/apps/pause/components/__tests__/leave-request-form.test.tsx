// @vitest-environment happy-dom

import { i18n } from "@lingui/core";
import { I18nProvider as LinguiProvider } from "@lingui/react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentProps, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { LeaveRequestForm } from "../leave-request-form";

i18n.load("en", {});
i18n.activate("en");

const mutate = vi.fn();
vi.mock("@lingui/macro", () => ({
	Trans: ({ children }: { children?: ReactNode }) => children,
	t: (str: string) => str,
}));

vi.mock("@ataqu/api-client", () => ({
	useCreateLeaveRequest: () => ({ mutate, isPending: false }),
}));

vi.mock("@ataqu/ui", () => ({
	Button: ({ children, ...props }: ComponentProps<"button">) => (
		<button type="submit" {...props}>
			{children}
		</button>
	),
	Input: (props: ComponentProps<"input">) => <input {...props} />,
	Label: ({ children }: ComponentProps<"span">) => <span>{children}</span>,
	LoadingButton: ({
		children,
		onAction,
	}: {
		children?: ReactNode;
		onAction?: () => unknown;
	}) => (
		<button type="button" onClick={() => onAction?.()}>
			{children}
		</button>
	),
}));

describe("LeaveRequestForm", () => {
	it("submits form with valid data", async () => {
		const { container } = render(
			<LinguiProvider i18n={i18n}>
				<LeaveRequestForm employeeId="123" />
			</LinguiProvider>,
		);

		// Ensure the form elements are rendered (they might be conditionally hidden)
		// The LeaveRequestForm uses react-hook-form with a <select> element.
		// The select might be rendered, but we need to get it by role or label.
		const select = container.querySelector("#leave_type");
		if (!select) {
			// If not found, try to get it by role
			const selectRole = screen.getByRole("combobox", { name: /Leave Type/i });
			fireEvent.change(selectRole, { target: { value: "sick" } });
		} else {
			fireEvent.change(select, { target: { value: "sick" } });
		}

		const startDateInput = container.querySelector("#start_date");
		if (!startDateInput) {
			const startInput = screen.getByLabelText(/Start Date/i);
			fireEvent.change(startInput, { target: { value: "2026-01-01" } });
		} else {
			fireEvent.change(startDateInput, { target: { value: "2026-01-01" } });
		}

		const endDateInput = container.querySelector("#end_date");
		if (!endDateInput) {
			const endInput = screen.getByLabelText(/End Date/i);
			fireEvent.change(endInput, { target: { value: "2026-01-02" } });
		} else {
			fireEvent.change(endDateInput, { target: { value: "2026-01-02" } });
		}

		const submitButton = screen.getByRole("button", { name: /Request Leave/i });
		fireEvent.click(submitButton);

		await waitFor(() => {
			expect(mutate).toHaveBeenCalledWith(
				expect.objectContaining({
					employee_id: "123",
					leave_type: "sick",
					start_date: "2026-01-01",
					end_date: "2026-01-02",
				}),
			);
		});
	});
});
