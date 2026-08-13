// @vitest-environment happy-dom
import { render, screen } from "@testing-library/react";
import type { ComponentProps, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { ApprovalDashboard } from "../approval-dashboard";

interface MockLeaveRequest {
	id: string;
	employee_name: string;
	status: string;
	leave_type: string;
	start_date: string;
	end_date: string;
}

vi.mock("@lingui/macro", () => ({
	Trans: ({ children }: { children?: ReactNode }) => children,
	t: (str: string) => str,
}));

vi.mock("@ataqu/api-client", () => ({
	useListLeaveRequests: () => ({
		data: [
			{
				id: "1",
				employee_name: "John",
				status: "pending",
				leave_type: "annual",
				start_date: "2026-01-01",
				end_date: "2026-01-02",
			},
		],
		isLoading: false,
	}),
	useApproveLeaveRequest: () => ({ mutate: vi.fn(), isPending: false }),
	useRejectLeaveRequest: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("@tanstack/react-query", () => ({
	useQueryClient: () => ({
		cancelQueries: vi.fn(),
		getQueryData: vi.fn(),
		setQueryData: vi.fn(),
		invalidateQueries: vi.fn(),
	}),
}));

vi.mock("@ataqu/ui", () => ({
	Badge: ({ children }: ComponentProps<"span">) => <span>{children}</span>,
	Button: ({ children }: ComponentProps<"button">) => (
		<button type="button">{children}</button>
	),
	DataTable: ({ data }: { data: MockLeaveRequest[] }) => (
		<table>
			<tbody>
				{data.map((d) => (
					<tr key={d.id}>
						<td>{d.employee_name}</td>
						<td>{d.status}</td>
					</tr>
				))}
			</tbody>
		</table>
	),
}));

describe("ApprovalDashboard", () => {
	it("renders pending leave request", () => {
		render(<ApprovalDashboard />);
		expect(screen.getByText("John")).toBeTruthy();
		expect(screen.getByText("pending")).toBeTruthy();
	});
});
