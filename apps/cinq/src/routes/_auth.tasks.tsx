import { createFileRoute } from '@tanstack/react-router';
import { DashboardLayout, EmptyState } from '@ataqu/ui';
import { Trans } from '@lingui/react/macro';
import { TaskList } from '../components/task-list';
import { CheckSquare } from 'lucide-react';

export const Route = createFileRoute('/_auth/tasks')({
  component: TasksPage,
});

function TasksPage() {
  return (
    <DashboardLayout title={<Trans>Tasks</Trans>}>
      <div className="p-4">
        <TaskList />
        <EmptyState
          icon={CheckSquare}
          title={<Trans>No tasks</Trans>}
          description={<Trans>Create tasks to track follow‑ups and to‑dos.</Trans>}
          ctaLabel={<Trans>Create Task</Trans>}
        />
      </div>
    </DashboardLayout>
  );
}
