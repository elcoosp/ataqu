import { Button, DashboardLayout } from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { CreateTaskDialog } from "../components/create-task-dialog";
import { TaskList } from "../components/task-list";

export const Route = createFileRoute("/_auth/tasks")({
	component: TasksPage,
});

function TasksPage() {
	const [openCreate, setOpenCreate] = useState(false);
	return (
		<DashboardLayout>
			<div className="p-4">
				<div className="flex items-center justify-between mb-4">
					<h1 className="text-2xl font-bold">
						<Trans>Tasks</Trans>
					</h1>
					<Button size="sm" onClick={() => setOpenCreate(true)}>
						<Plus className="h-4 w-4 mr-1" />
						<Trans>New Task</Trans>
					</Button>
				</div>
				<TaskList />
			</div>
			<CreateTaskDialog open={openCreate} onOpenChange={setOpenCreate} />
		</DashboardLayout>
	);
}
