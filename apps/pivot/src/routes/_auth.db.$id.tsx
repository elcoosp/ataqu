import { createFileRoute } from '@tanstack/react-router';
import { useGetDatabase } from '@/api';
import { Trans } from '@lingui/react/macro';
import { DatabaseGrid } from '@/components/database-grid';
import { OnboardTour } from '@ataqu/ui';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@ataqu/ui';

export const Route = createFileRoute('/_auth/db/$id')({
  component: DatabaseDetail,
});

function DatabaseDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: db } = useGetDatabase(id);

  // Simulate columns; in real app, columns come from metadata
  const columns = [
    { name: 'Name', type: 'text' },
    { name: 'Amount', type: 'number' },
    { name: 'Date', type: 'date' },
    { name: 'Status', type: 'select' },
    { name: 'Deal', type: 'relation' },
  ] as const;

  if (!db) return <div><Trans>Loading…</Trans></div>;

  return (
    <OnboardTour tourId="pivot-db-tour" steps={[
      { target: '[data-tour="new-row"]', content: 'High-density data. No 5-second load times.' },
      { target: '[data-tour="relation-column"]', content: 'Link natively to CINQ deals. No API keys required.' },
    ]}>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/db' })}>
            ← <Trans>Back</Trans>
          </Button>
          <h1 className="text-2xl font-heading">{db.name}</h1>
        </div>
        <DatabaseGrid databaseId={id} columns={columns} />
      </div>
    </OnboardTour>
  );
}
