import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge, Button } from '@ataqu/ui';
import { toast } from 'sonner';
import { Trans } from '@lingui/react/macro';
import { api } from '@ataqu/api-client';
import type { UUID } from '@ataqu/types';

export function IntegrationToggle({
  dealId,
  targetApp,
  label,
}: {
  dealId: UUID;
  targetApp: 'dial' | 'spark';
  label: string;
}) {
  const queryClient = useQueryClient();
  const [enabled, setEnabled] = useState(false);

  const mutation = useMutation({
    mutationFn: (enabled: boolean) =>
      api.post('/integrations/toggle', {
        sourceApp: 'cinq',
        targetApp,
        entityId: dealId,
        enabled,
      }),
    onSuccess: (data: any) => {
      setEnabled(data.enabled);
      queryClient.invalidateQueries({ queryKey: ['cinq', 'deal', dealId] });
      toast.success(
        data.enabled
          ? `CINQ connected to ${targetApp}`
          : `CINQ disconnected from ${targetApp}`
      );
    },
    onError: () => {
      toast.error('Failed to toggle integration');
      setEnabled(!enabled);
    },
  });

  const handleToggle = () => {
    const newValue = !enabled;
    setEnabled(newValue);
    mutation.mutate(newValue);
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={enabled ? 'default' : 'outline'}
        size="sm"
        onClick={handleToggle}
        className="min-w-[100px]"
      >
        {enabled ? 'Connected' : 'Connect'}
      </Button>
      <span className="text-sm">{label}</span>
      {enabled && (
        <Badge variant="outline">
          <Trans>Connected to {targetApp}</Trans>
        </Badge>
      )}
    </div>
  );
}
