import { createFileRoute } from '@tanstack/react-router';
import { DashboardLayout } from '@ataqu/ui';
import { Trans } from '@lingui/react/macro';
import { TaskList } from '../components/task-list';

export const Route = createFileRoute('/_auth/tasks')({
  component: TasksPage,
});

function TasksPage() {
  return (
    <DashboardLayout>
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4"><Trans>Tasks</Trans></h1>
        <TaskList />
      </div>
    </DashboardLayout>
  );
}
