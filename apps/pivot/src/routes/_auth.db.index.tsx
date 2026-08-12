import { createFileRoute, Link } from '@tanstack/react-router';
import { useListDatabases, useCreateDatabase } from '@ataqu/api-client';
import { useIdempotency } from '@ataqu/shared-hooks';
import { Button } from '@ataqu/ui';
import { Trans } from '@lingui/react/macro';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

export const Route = createFileRoute('/_auth/db/')({
  component: DatabaseList,
});

function DatabaseList() {
  const { data: databases, refetch } = useListDatabases();
  const { mutate: createDb } = useCreateDatabase();
  const { getKey } = useIdempotency();

  const handleCreate = () => {
    createDb(
      { name: 'New Database' },
      {
        headers: { 'Idempotency-Key': getKey() },
        onSuccess: () => {
          toast.success(<Trans>Database created.</Trans>);
          refetch();
        },
      }
    );
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
        {databases?.map((db) => (
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
