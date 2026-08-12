import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Switch, Badge, useToast } from '@ataqu/ui';
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
  const { toast } = useToast();
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
      toast({
        title: data.enabled ? (
          <Trans>CINQ connected to {targetApp}</Trans>
        ) : (
          <Trans>CINQ disconnected from {targetApp}</Trans>
        ),
      });
    },
    onError: () => {
      toast({ title: <Trans>Failed to toggle integration</Trans>, variant: 'destructive' });
      setEnabled(!enabled);
    },
  });

  const handleToggle = (checked: boolean) => {
    setEnabled(checked);
    mutation.mutate(checked);
  };

  return (
    <div className="flex items-center gap-2">
      <Switch checked={enabled} onCheckedChange={handleToggle} />
      <span className="text-sm">{label}</span>
      {enabled && (
        <Badge variant="success">
          <Trans>Connected to {targetApp}</Trans>
        </Badge>
      )}
    </div>
  );
}
