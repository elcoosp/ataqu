import { createFileRoute, Link } from '@tanstack/react-router';
import { useListDocuments, useCreateDocument } from '@ataqu/api-client';
import { useIdempotency } from '@ataqu/shared-hooks';
import { handleApiError } from '@ataqu/shared-utils';
import { Button, EmptyState } from '@ataqu/ui';
import { Trans } from '@lingui/react/macro';
import { Plus, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { SearchBar } from '@/components/search-bar';
import type { Document } from '@/types';

export const Route = createFileRoute('/_auth/')({
  component: DocumentList,
});

function DocumentList() {
  const { getKey } = useIdempotency();
  const { data, refetch, error } = useListDocuments();
  const createMutation = useCreateDocument({
    onSuccess: () => {
      toast.success(<Trans>Document created.</Trans>);
      refetch();
    },
    onError: (err) => toast.error(handleApiError(err)),
  });

  if (error) toast.error(handleApiError(error));

  const handleCreate = () => {
    createMutation.mutate(
      { title: 'Untitled', content: '' },
      { headers: { 'Idempotency-Key': getKey() } }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-heading"><Trans>Documents</Trans></h1>
        <Button size="sm" onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-1" />
          <Trans>Create Document</Trans>
        </Button>
      </div>

      <SearchBar
        className="max-w-sm"
        onResultClick={(result) => {
          if (result.type === 'document') {
            window.location.href = `/doc/${result.id}`;
          }
        }}
      />

      {data?.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={<Trans>No documents</Trans>}
          description={<Trans>Create your first document, or link it to a CINQ deal.</Trans>}
          ctaLabel={<Trans>Create Document</Trans>}
          onCta={handleCreate}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.map((doc) => (
            <Link key={doc.id} to="/doc/$id" params={{ id: doc.id }} className="block">
              <div className="border border-border rounded p-4 hover:border-primary transition-colors">
                <h3 className="font-medium">{doc.title}</h3>
                <p className="text-sm text-muted-foreground">{doc.content?.slice(0, 60)}…</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
