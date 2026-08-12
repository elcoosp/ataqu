import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Inbox } from 'lucide-react';
import { EmptyState } from '../components/ui/empty-state';
import { SubmissionsTable } from '../components/submissions-table';
import { IntegrationToggle } from '../components/integration-toggle';
import { useListSubmissions, exportFormSubmissions, api } from '@ataqu/api-client';
import { useMutation } from '@tanstack/react-query';

export const Route = createFileRoute('/_auth/submissions/$id')({
  component: SubmissionsRoute,
});

function SubmissionsRoute() {
  const { id } = Route.useParams();
  const { data: submissions = [], isLoading } = useListSubmissions(id);
  const [cinqEnabled, setCinqEnabled] = useState(false);
  const [sparkEnabled, setSparkEnabled] = useState(false);

  const exportMutation = useMutation({
    mutationFn: () => exportFormSubmissions(id),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'submissions.csv';
      a.click();
      URL.revokeObjectURL(url);
    },
  });

  const toggleIntegration = useMutation({
    mutationFn: ({ targetApp, enabled }: { targetApp: string; enabled: boolean }) =>
      api.post<void>('/integrations/toggle', {
        sourceApp: 'sond',
        targetApp,
        entityId: id,
        enabled,
      }),
  });

  const handleToggleCinq = (enabled: boolean) => {
    setCinqEnabled(enabled);
    toggleIntegration.mutate({ targetApp: 'cinq', enabled });
  };
  const handleToggleSpark = (enabled: boolean) => {
    setSparkEnabled(enabled);
    toggleIntegration.mutate({ targetApp: 'spark', enabled });
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-8">
      <h1 className="text-3xl font-bold">Submissions</h1>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <IntegrationToggle
          label="Create CINQ lead on submission"
          enabled={cinqEnabled}
          onToggle={handleToggleCinq}
          connectedBadge="Connected to CINQ"
        />
        <IntegrationToggle
          label="Trigger SPARK workflow on submission"
          enabled={sparkEnabled}
          onToggle={handleToggleSpark}
          connectedBadge="Connected to SPARK"
        />
      </div>

      {submissions.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No submissions yet"
          description="Publish your form to start collecting responses."
        />
      ) : (
        <SubmissionsTable submissions={submissions} onExport={() => exportMutation.mutate()} />
      )}
    </div>
  );
}
