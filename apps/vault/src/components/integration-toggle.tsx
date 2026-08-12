import { api } from '@ataqu/api-client';
import type { UUID } from '@ataqu/types';
import { Badge } from '@ataqu/ui';
import { Trans } from '@lingui/react/macro';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

export function IntegrationToggle({ entityId }: { entityId: UUID }) {
  const queryClient = useQueryClient();
  const [enabled, setEnabled] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const { data: status } = useQuery({
    queryKey: ['integrations', 'cinq', entityId],
    queryFn: () =>
      api.get<{ enabled: boolean }>('/api/v1/integrations/status', {
        params: { sourceApp: 'cinq', targetApp: 'vault', entityId },
      }),
  });

  const toggleIntegration = useMutation({
    mutationFn: (nextEnabled: boolean) =>
      api.post<void>('/api/v1/integrations/toggle', {
        sourceApp: 'cinq',
        targetApp: 'vault',
        entityId,
        enabled: nextEnabled,
      }),
    onSuccess: () => {
      setStatusMsg('VAULT connected to CINQ.');
      queryClient.invalidateQueries({ queryKey: ['integrations', 'cinq', entityId] });
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Failed to toggle integration.';
      setStatusMsg(message);
    },
  });

  const isChecked = status?.enabled ?? enabled;

  const handleToggle = () => {
    const next = !isChecked;
    setEnabled(next);
    toggleIntegration.mutate(next);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-4">
        <button
          type="button"
          role="switch"
          aria-checked={isChecked}
          onClick={handleToggle}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            isChecked ? 'bg-primary' : 'bg-input'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
              isChecked ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <span className="text-sm text-foreground">
          <Trans>Reserve stock automatically when CINQ deal is won.</Trans>
        </span>
        {isChecked && (
          <Badge variant="default">
            <Trans>Connected to CINQ</Trans>
          </Badge>
        )}
      </div>
      {statusMsg && <p className="text-xs text-muted-foreground">{statusMsg}</p>}
    </div>
  );
}
