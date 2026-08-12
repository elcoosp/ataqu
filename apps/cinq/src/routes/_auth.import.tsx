import { createFileRoute } from '@tanstack/react-router';
import { DashboardLayout } from '@ataqu/ui';
import { Trans } from '@lingui/react/macro';
import { CsvImport } from '../components/csv-import';

export const Route = createFileRoute('/_auth/import')({
  component: ImportPage,
});

function ImportPage() {
  return (
    <DashboardLayout title={<Trans>Import CSV</Trans>}>
      <div className="p-4 max-w-3xl mx-auto">
        <CsvImport />
      </div>
    </DashboardLayout>
  );
}
