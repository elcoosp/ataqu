import { createFileRoute } from '@tanstack/react-router';
import { useListDocuments, useCreateDocument, useDeleteDocument } from '@/api';
import { useIdempotency } from '@ataqu/shared-hooks';
import { Button, EmptyState } from '@ataqu/ui';
import { Trans } from '@lingui/react/macro';
import { FileText, Grid, List, Plus, Database } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { SearchBar } from '@/components/search-bar';

export const Route = createFileRoute('/_auth/')({
  component: DocumentList,
});

function DocumentList() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const { data: documents, refetch } = useListDocuments();
  const { mutate: createDoc } = useCreateDocument();
  const { mutate: deleteDoc } = useDeleteDocument();
  const { getKey } = useIdempotency();

  const handleCreate = () => {
    createDoc(
      { data: { title: 'Untitled', content: '' }, headers: { 'Idempotency-Key': getKey() } },
      {
        onSuccess: (doc) => {
          toast.success(<Trans>Document created.</Trans>);
          refetch();
          // navigate to doc? optional
        },
      }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-heading"><Trans>Documents</Trans></h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setViewMode('grid')}>
            <Grid className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setViewMode('list')}>
            <List className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-1" />
            <Trans>Create Document</Trans>
          </Button>
          <Link to="/db">
            <Button variant="outline" size="sm">
              <Database className="h-4 w-4 mr-1" />
              <Trans>Databases</Trans>
            </Button>
          </Link>
        </div>
      </div>

      <SearchBar className="max-w-sm" />

      {documents?.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={<Trans>No documents</Trans>}
          description={<Trans>Create your first document, or link it to a CINQ deal.</Trans>}
          ctaLabel={<Trans>Create Document</Trans>}
          onCta={handleCreate}
        />
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-2'}>
          {documents?.map((doc: any) => (
            <Link key={doc.id} to="/doc/$id" params={{ id: doc.id }} className="block">
              <div className="border border-border rounded p-4 hover:border-primary transition-colors">
                <h3 className="font-medium">{doc.title}</h3>
                <p className="text-sm text-muted-foreground">{doc.content?.slice(0, 60)}…</p>
                <p className="text-xs text-muted-foreground mt-2">{new Date(doc.created_at).toLocaleDateString()}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
