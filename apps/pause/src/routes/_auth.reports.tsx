import { Shell } from '@ataqu/ui';
import { Trans } from '@lingui/react/macro';
import { createFileRoute } from '@tanstack/react-router';
import { ReportsView } from '../components/reports';

export const Route = createFileRoute('/_auth/reports')({
  component: ReportsPage,
});

function ReportsPage() {
  return (
    <Shell activeApp="pause">
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-8">
          <Trans>Reports</Trans>
        </h1>
        <ReportsView />
      </div>
    </Shell>
  );
}
