import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '@ataqu/api-client';
import { handleApiError } from '@ataqu/shared-utils';
import { Button } from '@ataqu/ui';
import { Trans } from '@lingui/react/macro';
import { toast } from 'sonner';
import { DocumentEditor } from '@/components/document-editor';
import type { Document } from '@/types';

export const Route = createFileRoute('/_auth/doc/$id')({
  component: DocumentDetail,
});

function DocumentDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data, error, refetch } = useQuery<Document>({
    queryKey: ['document', id],
    queryFn: () => api.get(`/docs/${id}`),
  });

  if (error) {
    toast.error(handleApiError(error));
  }

  const handleDelete = () => navigate({ to: '/' });
  const handleDuplicate = () => toast.info(<Trans>Duplicate coming soon.</Trans>);

  if (!data) return <div><Trans>Loading…</Trans></div>;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 p-2 border-b border-border">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/' })}>
          ← <Trans>Back</Trans>
        </Button>
      </div>
      <DocumentEditor
        id={id}
        initialDoc={data}
        onDelete={handleDelete}
        onDuplicate={handleDuplicate}
      />
    </div>
  );
}
