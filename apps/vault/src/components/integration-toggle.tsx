import { api } from '@ataqu/api-client';
import type { UUID } from '@ataqu/types';
import { Badge } from '@ataqu/ui';
import { Trans } from '@lingui/react/macro';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { showToast } from './toast-store';

export function IntegrationToggle({ entityId }: { entityId: UUID }) {
  const queryClient = useQueryClient();
  const [localEnabled, setLocalEnabled] = useState(false);

  const { data: status } = useQuery({
    queryKey: ['integrations', 'cinq', entityId],
    queryFn: () =>
      api.get<{ enabled: boolean }>('/api/v1/integrations/status', {
        params: { sourceApp: 'cinq', targetApp: 'vault', entityId },
      }),
    retry: false,
  });

  const isChecked = status?.enabled ?? localEnabled;

  const toggleIntegration = useMutation({
    mutationFn: (nextEnabled: boolean) =>
      api.post<void>('/api/v1/integrations/toggle', {
        sourceApp: 'cinq',
        targetApp: 'vault',
        entityId,
        enabled: nextEnabled,
      }),
    onSuccess: (_data, nextEnabled) => {
      setLocalEnabled(nextEnabled);
      void queryClient.invalidateQueries({
        queryKey: ['integrations', 'cinq', entityId],
      });

      showToast({
        variant: 'success',
        title: nextEnabled ? (
          <Trans>VAULT connected to CINQ.</Trans>
        ) : (
          <Trans>VAULT disconnected from CINQ.</Trans>
        ),
      });
    },
    onError: () => {
      showToast({
        variant: 'error',
        title: <Trans>Integration update failed.</Trans>,
        description: (
          <Trans>
            Could not toggle the CINQ integration. Check your permissions and try again.
          </Trans>
        ),
      });
    },
  });

  const handleToggle = () => {
    toggleIntegration.mutate(!isChecked);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-4">
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
        {isChecked ? (
          <Badge variant="default">
            <Trans>Connected to CINQ</Trans>
          </Badge>
        ) : null}
      </div>
    </div>
  );
}
