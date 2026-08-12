import { useQuery } from '@tanstack/react-query';
import { Badge, Skeleton } from '@ataqu/ui';
import { Trans } from '@lingui/react/macro';
import { api } from '@ataqu/api-client';
import type { UUID } from '@ataqu/types';

export function CrossAppBadge({ entityId }: { entityId: UUID }) {
  const { data, isLoading } = useQuery({
    queryKey: ['cinq', 'crossApp', entityId],
    queryFn: () => api.get('/cross-app/relations', { params: { entityId } }),
  });

  if (isLoading) return <Skeleton className="h-6 w-24" />;
  if (!data || (data as any[]).length === 0) return null;

  const relations = data as any[];
  const vaultRelation = relations.find((r) => r.app === 'vault');
  if (!vaultRelation) return null;

  return (
    <Badge variant="info" className="gap-1">
      <Trans>Stock reserved in VAULT</Trans>
      <a
        href={vaultRelation.link}
        target="_blank"
        rel="noopener noreferrer"
        className="underline"
      >
        {vaultRelation.label}
      </a>
    </Badge>
  );
}
