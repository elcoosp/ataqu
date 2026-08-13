import { Shell } from '@ataqu/ui';
import { createFileRoute } from '@tanstack/react-router';
import { EmployeeDetail } from '../components/employee-detail';

export const Route = createFileRoute('/_auth/employees/$id')({
  component: EmployeeDetailPage,
});

function EmployeeDetailPage() {
  const { id } = Route.useParams();
  return (
    <Shell activeApp="pause">
      <div className="p-8">
        <EmployeeDetail id={id} />
      </div>
    </Shell>
  );
}
