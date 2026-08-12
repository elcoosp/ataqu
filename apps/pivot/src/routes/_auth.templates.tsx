import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@ataqu/api-client';
import { useIdempotency } from '@ataqu/shared-hooks';
import { handleApiError } from '@ataqu/shared-utils';
import { Button, Input } from '@ataqu/ui';
import { Trans } from '@lingui/react/macro';
import { i18n } from '@lingui/core';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import type { Template } from '@/types';

export const Route = createFileRoute('/_auth/templates')({
  component: TemplatesPage,
});

function TemplatesPage() {
  const { getKey } = useIdempotency();
  const { data, refetch, error } = useQuery<Template[]>({
    queryKey: ['templates'],
    queryFn: () => api.get('/templates'),
  });

  if (error) toast.error(handleApiError(error));

  const [showCreator, setShowCreator] = useState(false);
  const [name, setName] = useState('');
  const [content, setContent] = useState('');

  const createMutation = useMutation({
    mutationFn: (data: { name: string; content: string }) =>
      api.post<Template>('/templates', data, {
        headers: { 'Idempotency-Key': getKey() },
      }),
    onSuccess: () => {
      toast.success(<Trans>Template created.</Trans>);
      setShowCreator(false);
      setName('');
      setContent('');
      refetch();
    },
    onError: (err) => toast.error(handleApiError(err)),
  });

  const handleCreate = () => {
    if (!name.trim()) return toast.error(<Trans>Name is required.</Trans>);
    createMutation.mutate({ name, content });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-heading"><Trans>Templates</Trans></h1>
        <Button size="sm" onClick={() => setShowCreator(true)}>
          <Plus className="h-4 w-4 mr-1" />
          <Trans>Create Template</Trans>
        </Button>
      </div>
      {showCreator && (
        <div className="border border-border rounded p-4 space-y-3">
          <Input
            placeholder={i18n.t`Template name`}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <textarea
            className="w-full p-2 border border-border rounded bg-background"
            rows={6}
            placeholder={i18n.t`Template content (markdown)`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <div className="flex gap-2">
            <Button onClick={handleCreate}><Trans>Save</Trans></Button>
            <Button variant="outline" onClick={() => setShowCreator(false)}>
              <Trans>Cancel</Trans>
            </Button>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(data || []).map((t) => (
          <div key={t.id} className="border border-border rounded p-4">
            <h3 className="font-medium">{t.name}</h3>
            <p className="text-sm text-muted-foreground truncate">{t.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
