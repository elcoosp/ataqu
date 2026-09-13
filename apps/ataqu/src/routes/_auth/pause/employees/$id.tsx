import { createFileRoute } from "@tanstack/react-router";
import { EmployeeDetail } from "../../../../apps/pause/components/employee-detail";

export const Route = createFileRoute("/_auth/pause/employees/$id")({
	component: EmployeeDetailPage,
});

function EmployeeDetailPage() {
	const { id } = Route.useParams();
	return (
		<div className="p-8">
				<EmployeeDetail id={id} />
			</div>
	);
}
