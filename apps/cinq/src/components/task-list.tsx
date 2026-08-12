import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Checkbox, Badge, Skeleton } from '@ataqu/ui';
import { Trans } from '@lingui/react/macro';
import { useListTasks, useUpdateTask } from '@ataqu/api-client';
import type { UUID } from '@ataqu/types';

export function TaskList({ dealId }: { dealId?: UUID }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useListTasks({ limit: 100 });

  const updateTask = useUpdateTask();

  if (isLoading) return <Skeleton className="h-32 w-full" />;

  const tasks = data?.items || [];

  return (
    <div className="space-y-2">
      {tasks.length === 0 ? (
        <p className="text-muted-foreground"><Trans>No tasks</Trans></p>
      ) : (
        tasks.map((task) => (
          <div key={task.id} className="flex items-center gap-4 p-2 border-b">
            <Checkbox
              checked={task.status === 'completed'}
              onCheckedChange={(checked) => {
                updateTask.mutate({
                  id: task.id,
                  data: { status: checked ? 'completed' : 'pending' },
                });
              }}
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
