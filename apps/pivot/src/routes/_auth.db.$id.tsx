import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '@ataqu/api-client';
import { handleApiError } from '@ataqu/shared-utils';
import { Button } from '@ataqu/ui';
import { Trans } from '@lingui/react/macro';
import { toast } from 'sonner';
import { DatabaseGrid } from '@/components/database-grid';
import type { Database } from '@/types';

export const Route = createFileRoute('/_auth/db/$id')({
  component: DatabaseDetail,
});

function DatabaseDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data, error } = useQuery<Database>({
    queryKey: ['database', id],
    queryFn: () => api.get(`/databases/${id}`),
  });

  if (error) toast.error(handleApiError(error));
  if (!data) return <div><Trans>Loading…</Trans></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/db' })}>
          ← <Trans>Back</Trans>
        </Button>
        <h1 className="text-2xl font-heading">{data.name}</h1>
      </div>
      <DatabaseGrid databaseId={id} />
    </div>
  );
}
