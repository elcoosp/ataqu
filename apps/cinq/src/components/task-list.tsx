import type { TaskResponse } from "@ataqu/api-client";
import {
	useBulkDeleteTasks,
	useDeleteTask,
	useListTasks,
	useUpdateTask,
} from "@ataqu/api-client";
import { Badge, Bone, Skeleton } from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function TaskList() {
	const _queryClient = useQueryClient();
	const { data, isLoading } = useListTasks({ limit: 100 });
	const tasks = data || [];

	const updateTaskMutation = useUpdateTask();
	const deleteTask = useDeleteTask({
		onSuccess: () => {
			_queryClient.invalidateQueries({ queryKey: ["cinq", "tasks"] });
			toast.success("Task deleted.");
		},
		onError: () => toast.error("Delete failed"),
	});
	const bulkDelete = useBulkDeleteTasks({
		onSuccess: () => {
			_queryClient.invalidateQueries({ queryKey: ["cinq", "tasks"] });
			toast.success("Tasks deleted.");
			setSelected([]);
		},
		onError: () => toast.error("Bulk delete failed"),
	});
	const [selected, setSelected] = useState<string[]>([]);

	if (isLoading)
		return (
			<Bone
				loading
				name="tasks"
				fallback={<Skeleton className="h-32 w-full" />}
			>
				{null}
			</Bone>
		);

	return (
		<div className="space-y-2">
			{selected.length > 0 && (
				<div className="flex items-center gap-2 p-2 bg-card border border-border rounded-md">
					<span className="text-sm text-muted-foreground">
						{selected.length} selected
					</span>
					<button
						type="button"
						className="text-red-400 hover:text-red-300 text-sm"
						onClick={() => bulkDelete.mutate({ ids: selected })}
					>
						Delete
					</button>
				</div>
			)}
			{tasks.length === 0 ? (
				<p className="text-muted-foreground">
					<Trans>No tasks</Trans>
				</p>
			) : (
				tasks.map((task: TaskResponse) => (
					<div key={task.id} className="flex items-center gap-4 p-2 border-b">
						<input
							type="checkbox"
							checked={selected.includes(task.id)}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
								if (e.target.checked) setSelected((s) => [...s, task.id]);
								else setSelected((s) => s.filter((id) => id !== task.id));
							}}
							className="h-4 w-4 rounded border-gray-600 bg-transparent text-amber focus:ring-amber"
						/>
						<input
							type="checkbox"
							checked={task.status === "completed"}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
								const checked = e.target.checked;
								updateTaskMutation.mutate({
									id: task.id,
									data: { status: checked ? "completed" : "pending" },
									version: task.version,
								});
							}}
							className="h-4 w-4 rounded border-gray-600 bg-transparent text-amber focus:ring-amber"
						/>
						<span
							className={
								task.status === "completed"
									? "line-through text-muted-foreground"
									: ""
							}
						>
							{task.title}
						</span>
						<Badge variant="outline">{task.status}</Badge>
						{task.due_date && (
							<span className="text-sm text-muted-foreground">
								{new Date(task.due_date).toLocaleDateString()}
							</span>
						)}
						<button
							type="button"
							aria-label="Delete task"
							className="ml-auto text-red-400 hover:text-red-300"
							onClick={() => deleteTask.mutate(task.id)}
						>
							<Trash2 className="h-4 w-4" />
						</button>
					</div>
				))
			)}
		</div>
	);
}
