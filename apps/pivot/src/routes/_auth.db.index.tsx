import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@ataqu/api-client';
import { useIdempotency } from '@ataqu/shared-hooks';
import { Button } from '@ataqu/ui';
import { Trans } from '@lingui/react/macro';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

interface Database {
  id: string;
  name: string;
}

export const Route = createFileRoute('/_auth/db/')({
  component: DatabaseList,
});

function DatabaseList() {
  const { getKey } = useIdempotency();
  const { data, refetch } = useQuery<Database[]>({
    queryKey: ['databases'],
    queryFn: () => api.get('/databases'),
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string }) =>
      api.post('/databases', data, { headers: { 'Idempotency-Key': getKey() } }),
    onSuccess: () => {
      toast.success(<Trans>Database created.</Trans>);
      refetch();
    },
  });

  const handleCreate = () => {
    createMutation.mutate({ name: 'New Database' });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-heading"><Trans>Databases</Trans></h1>
        <Button size="sm" onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-1" />
          <Trans>Create Database</Trans>
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(data || [])?.map((db) => (
          <Link key={db.id} to="/db/$id" params={{ id: db.id }} className="block">
            <div className="border border-border rounded p-4 hover:border-primary transition-colors">
              <h3 className="font-medium">{db.name}</h3>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
