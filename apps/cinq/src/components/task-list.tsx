import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge, Skeleton } from '@ataqu/ui';
import { Trans } from '@lingui/react/macro';
import { listTasks, updateTask } from '@ataqu/api-client';
import type { TaskResponse } from '@ataqu/api-client';

export function TaskList() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['cinq', 'tasks', 'list'],
    queryFn: () => listTasks({ limit: 100 }),
  });
  const tasks = data || [];

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { status: string } }) =>
      updateTask(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cinq', 'tasks'] });
    },
  });

  if (isLoading) return <Skeleton className="h-32 w-full" />;

  return (
    <div className="space-y-2">
      {tasks.length === 0 ? (
        <p className="text-muted-foreground"><Trans>No tasks</Trans></p>
      ) : (
        tasks.map((task: TaskResponse) => (
          <div key={task.id} className="flex items-center gap-4 p-2 border-b">
            <input
              type="checkbox"
              checked={task.status === 'completed'}
              onChange={(e) => {
                const checked = e.target.checked;
                updateTaskMutation.mutate({
                  id: task.id,
                  data: { status: checked ? 'completed' : 'pending' },
                });
              }}
              className="h-4 w-4 rounded border-gray-600 bg-transparent text-amber focus:ring-amber"
            />
            <span className={task.status === 'completed' ? 'line-through text-muted-foreground' : ''}>
              {task.title}
            </span>
            <Badge variant="outline">{task.status}</Badge>
            {task.due_date && (
              <span className="text-sm text-muted-foreground">
                {new Date(task.due_date).toLocaleDateString()}
              </span>
            )}
          </div>
        ))
      )}
    </div>
  );
}
