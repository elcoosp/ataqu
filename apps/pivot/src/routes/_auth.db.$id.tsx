import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useGetDatabase } from '@ataqu/api-client';
import { Button } from '@ataqu/ui';
import { Trans } from '@lingui/react/macro';

export const Route = createFileRoute('/_auth/db/$id')({
  component: DatabaseDetail,
});

function DatabaseDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: db } = useGetDatabase(id);

  if (!db) return <div><Trans>Loading…</Trans></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/db' })}>← <Trans>Back</Trans></Button>
        <h1 className="text-2xl font-heading">{db.name}</h1>
      </div>
      <div className="border border-border rounded p-4 text-muted-foreground">
        <Trans>Database grid will be implemented with inline editing and relation columns.</Trans>
      </div>
    </div>
  );
}
