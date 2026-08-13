import { createFileRoute } from '@tanstack/react-router';
import { DashboardLayout } from '@ataqu/ui';
import { Trans } from '@lingui/react/macro';
import { CsvImport } from '../components/csv-import';

export const Route = createFileRoute('/_auth/import')({
  component: ImportPage,
});

function ImportPage() {
  return (
    <DashboardLayout>
      <div className="p-4 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-4"><Trans>Import CSV</Trans></h1>
        <CsvImport />
      </div>
    </DashboardLayout>
  );
}
