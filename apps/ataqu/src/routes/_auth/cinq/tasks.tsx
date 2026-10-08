import { searchSchema, useUrlState } from "@ataqu/shared-hooks";
import { Button, PageLayout } from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { CreateTaskDialog } from "../../../apps/cinq/components/create-task-dialog";
import { TaskList } from "../../../apps/cinq/components/task-list";

export const Route = createFileRoute("/_auth/cinq/tasks")({
	validateSearch: searchSchema({
		createOpen: (raw: unknown) => raw === "1",
	}),
	component: TasksPage,
});

function TasksPage() {
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	const [openCreate, setOpenCreate] = useUrlState({
		search,
		setSearch: (next) => navigate({ search: next as never }),
		key: "createOpen",
		default: false,
		parse: (raw: unknown) => raw === "1",
		serialize: (v) => (v ? "1" : undefined),
	});
	return (
		<PageLayout
			title={<Trans>Tasks</Trans>}
			breadcrumbs={[
				{ label: "CINQ", to: "/cinq/dashboard" },
				{ label: "Tasks" },
			]}
			actions={
				<Button size="sm" onClick={() => setOpenCreate(true)}>
					<Plus className="mr-1 h-4 w-4" />
					<Trans>New Task</Trans>
				</Button>
			}
		>
			<TaskList />
			<CreateTaskDialog open={openCreate} onOpenChange={setOpenCreate} />
		</PageLayout>
	);
}
