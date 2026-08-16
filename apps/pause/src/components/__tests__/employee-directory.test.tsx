// @vitest-environment happy-dom

import { i18n } from "@lingui/core";
import { I18nProvider as LinguiProvider } from "@lingui/react";
import { render, screen } from "@testing-library/react";
import type { ComponentProps, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { EmployeeDirectory } from "../employee-directory";

i18n.load("en", {});
i18n.activate("en");

vi.mock("@lingui/macro", () => ({
	Trans: ({ children }: { children?: ReactNode }) => children,
	t: (str: string) => str,
}));

vi.mock("@ataqu/api-client", () => ({
	useListEmployees: () => ({
		data: [
			{
				id: "1",
				full_name: "John Doe",
				job_title: "Dev",
				email: "john@doe.com",
			},
		],
		isLoading: false,
	}),
	useSearchEmployees: () => ({ data: [], isLoading: false }),
	useBulkDeactivateEmployees: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("@tanstack/react-router", () => ({
	useNavigate: () => () => {},
}));

vi.mock("@ataqu/shared-hooks", () => ({
	useDebounce: (v: string) => v,
}));

vi.mock("@tanstack/react-query", () => ({
	useQueryClient: () => ({
		invalidateQueries: vi.fn(),
		cancelQueries: vi.fn(),
		getQueryData: vi.fn(),
		setQueryData: vi.fn(),
	}),
}));

vi.mock("@ataqu/ui", () => ({
	Button: ({ children }: ComponentProps<"button">) => (
		<button type="button">{children}</button>
	),
	Input: () => <input />,
	Skeleton: () => <div />,
	Card: ({ children }: ComponentProps<"div">) => <div>{children}</div>,
}));

vi.mock("../empty-state", () => ({
	EmptyState: () => <div data-testid="empty-state" />,
}));

describe("EmployeeDirectory", () => {
	it("renders employee card", () => {
		render(
			<LinguiProvider i18n={i18n}>
				<EmployeeDirectory onAddEmployee={() => {}} />
			</LinguiProvider>,
		);
		expect(screen.getByText("John Doe")).toBeTruthy();
	});
});
