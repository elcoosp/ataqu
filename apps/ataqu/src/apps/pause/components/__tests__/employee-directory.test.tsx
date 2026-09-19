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
		data: {
			items: [
				{
					id: "1",
					full_name: "John Doe",
					job_title: "Dev",
					email: "john@doe.com",
				},
			],
			total: 1,
			limit: 100,
			offset: 0,
		},
		isLoading: false,
	}),
	useSearchEmployees: () => ({ data: [], isLoading: false }),
	useBulkDeactivateEmployees: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("@tanstack/react-router", () => ({
	useNavigate: () => () => {},
}));

vi.mock("@ataqu/shared-hooks", async () => {
	const React = await vi.importActual<typeof import("react")>("react");
	return {
		useDebounce: (v: string) => v,
		// Minimal stand-in: the real hook reads/writes window.location, which
		// the assertions here don't exercise.
		useUrlSearchParam: <T,>(_key: string, opts: { default: T }) =>
			React.useState<T>(opts.default),
	};
});

vi.mock("@tanstack/react-query", () => ({
	useQueryClient: () => ({
		invalidateQueries: vi.fn(),
		cancelQueries: vi.fn(),
		getQueryData: vi.fn(),
		setQueryData: vi.fn(),
	}),
}));

vi.mock("@ataqu/ui", () => ({
	EmptyState: () => <div data-testid="empty-state" />,
	Button: ({ children }: ComponentProps<"button">) => (
		<button type="button">{children}</button>
	),
	Input: () => <input />,
	Skeleton: () => <div />,
	Card: ({ children }: ComponentProps<"div">) => <div>{children}</div>,
	ExpandingSearch: ({
		value,
		onChange,
	}: {
		value: string;
		onChange: (v: string) => void;
	}) => (
		<input
			data-testid="expanding-search"
			value={value}
			onChange={(e) => onChange(e.target.value)}
		/>
	),
	HoldToConfirm: ({
		children,
		onConfirm,
	}: {
		children?: ReactNode;
		onConfirm: () => void;
	}) => (
		<button type="button" onClick={onConfirm}>
			{children}
		</button>
	),
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
