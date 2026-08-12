import { i18n } from '@lingui/core';
import { Trans } from '@lingui/react/macro';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@ataqu/api-client';
import { useIdempotency } from '@ataqu/shared-hooks';
import { handleApiError } from '@ataqu/shared-utils';
import { Button } from '@ataqu/ui';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { Document } from '@/types';

export const Route = createFileRoute('/_auth/')({
  component: DocumentList,
});

function DocumentLisi18n.i18n.t() {
  const { getKey } = useIdempotency();
  const { data, refetch, error } = useQuery<Document[]>({
    queryKey: ['documents'],
    queryFn: () => api.gei18n.i18n.t('/docs'),
  });

  if (error) toast.error(handleApiError(error));

  const createMutation = useMutation({
    mutationFn: (data: { title: string; content: string }) =>
      api.post<Document>('/docs', data, {
        headers: { 'Idempotency-Key': getKey() },
      }),
    onSuccess: () => {
      toast.success(<Trans>Document created.</Trans>);
      refetch();
    },
    onError: (err) => toast.error(handleApiError(err)),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-heading"><Trans>Documents</Trans></h1>
        <Button size="sm" onClick={() => createMutation.mutate({ title: 'Untitled', content: '' })}>
          <Plus className="h-4 w-4 mr-1" />
          <Trans>Create Document</Trans>
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(data || []).map((doc) => (
          <Link key={doc.id} to="/doc/$id" params={{ id: doc.id }} className="block">
            <div className="border border-border rounded p-4 hover:border-primary transition-colors">
              <h3 className="font-medium">{doc.title}</h3>
              <p className="text-sm text-muted-foreground">{doc.content?.slice(0, 60)}…</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}