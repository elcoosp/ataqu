import type { TaskResponse } from "@ataqu/api-client";
import {
	useBulkDeleteTasks,
	useDeleteTask,
	useGetTask,
	useListTasks,
	useUpdateTask,
} from "@ataqu/api-client";
import { formatDate, handleApiError } from "@ataqu/shared-utils";
import {
	Badge,
	Bone,
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	HoldToConfirm,
	SkeletonSwap,
} from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { Eye, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

function TaskDetailDialog({
	taskId,
	onOpenChange,
}: {
	taskId: string;
	onOpenChange: (open: boolean) => void;
}) {
	const { data: task, isLoading } = useGetTask(taskId);

	return (
		<Dialog open onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{isLoading ? "…" : (task?.title ?? "")}</DialogTitle>
				</DialogHeader>
				<Bone
					loading={isLoading}
					name="task-detail"
					fallback={<div className="h-20 rounded" />}
				>
					{null}
				</Bone>
				{task && (
					<dl className="space-y-2 text-sm">
						<div className="flex justify-between">
							<dt className="text-muted-foreground">Status</dt>
							<dd>{task.status}</dd>
						</div>
						<div className="flex justify-between">
							<dt className="text-muted-foreground">Due</dt>
							<dd>{task.due_date ?? "—"}</dd>
						</div>
						{task.description && (
							<div>
								<dt className="text-muted-foreground">Description</dt>
								<dd className="mt-1 whitespace-pre-wrap">{task.description}</dd>
							</div>
						)}
					</dl>
				)}
			</DialogContent>
		</Dialog>
	);
}

export function TaskList({ dealId }: { dealId?: string } = {}) {
	const _queryClient = useQueryClient();
	const { data, isLoading } = useListTasks({ limit: 100 });
	const tasks = (data || []).filter(
		(t: any) => !dealId || t.deal_id === dealId,
	);

	const updateTaskMutation = useUpdateTask();
	const deleteTask = useDeleteTask({
		onMutate: async (id) => {
			const pre = _queryClient.getQueryData(["cinq", "tasks", { limit: 100 }]);
			_queryClient.setQueryData(
				["cinq", "tasks", { limit: 100 }],
				(old: any) =>
					old
						? { ...old, items: old.items.filter((t: any) => t.id !== id) }
						: old,
			);
			return { preSnapshot: pre };
		},
		onSuccess: (_data, _vars, context: any) => {
			const pre = context?.preSnapshot;
			toast.success("Task deleted.", {
				action: {
					label: "Undo",
					onClick: () => {
						if (pre) {
							_queryClient.setQueryData(["cinq", "tasks", { limit: 100 }], pre);
							toast.dismiss();
						}
					},
				},
			});
		},
		onError: (_err, _vars, context: any) => {
			const pre = context?.preSnapshot;
			if (pre) {
				_queryClient.setQueryData(["cinq", "tasks", { limit: 100 }], pre);
			}
			toast.error("Delete failed");
		},
	});
	const bulkDelete = useBulkDeleteTasks({
		onMutate: async ({ ids }: { ids: string[] }) => {
			const pre = _queryClient.getQueryData(["cinq", "tasks", { limit: 100 }]);
			_queryClient.setQueryData(
				["cinq", "tasks", { limit: 100 }],
				(old: any) =>
					old
						? {
								...old,
								items: old.items.filter((t: any) => !ids.includes(t.id)),
							}
						: old,
			);
			return { preSnapshot: pre };
		},
		onSuccess: (_data, _vars, context: any) => {
			const pre = context?.preSnapshot;
			setSelected([]);
			toast.success("Tasks deleted.", {
				action: {
					label: "Undo",
					onClick: () => {
						if (pre) {
							_queryClient.setQueryData(["cinq", "tasks", { limit: 100 }], pre);
							toast.dismiss();
						}
					},
				},
			});
		},
		onError: (_err, _vars, context: any) => {
			const pre = context?.preSnapshot;
			if (pre) {
				_queryClient.setQueryData(["cinq", "tasks", { limit: 100 }], pre);
			}
			toast.error("Bulk delete failed");
		},
	});
	const [selected, setSelected] = useState<string[]>([]);
	const [detailId, setDetailId] = useState<string | null>(null);

	if (isLoading)
		return (
			<SkeletonSwap ready={false} lines={4}>
				<div className="h-32 w-full" />
			</SkeletonSwap>
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
						className="text-destructive hover:text-destructive text-sm"
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
							className="h-4 w-4 rounded border-border bg-transparent text-amber focus:ring-amber"
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
							className="h-4 w-4 rounded border-border bg-transparent text-amber focus:ring-amber"
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
								{formatDate(task.due_date)}
							</span>
						)}
						<button
							type="button"
							aria-label="View task"
							className="text-muted-foreground hover:text-foreground"
							onClick={() => setDetailId(task.id)}
						>
							<Eye className="h-4 w-4" />
						</button>
						<HoldToConfirm
							onConfirm={() => deleteTask.mutate(task.id)}
							confirmLabel="Deleted"
							className="ml-auto bg-destructive text-white hover:bg-destructive"
						>
							<Trash2 className="h-4 w-4" />
						</HoldToConfirm>
					</div>
				))
			)}
			{detailId && (
				<TaskDetailDialog
					taskId={detailId}
					onOpenChange={(open) => {
						if (!open) setDetailId(null);
					}}
				/>
			)}
		</div>
	);
}
