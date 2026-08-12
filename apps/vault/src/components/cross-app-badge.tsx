import { api } from '@ataqu/api-client';
import type { UUID } from '@ataqu/types';
import { Badge } from '@ataqu/ui';
import { Trans } from '@lingui/react/macro';
import { useQuery } from '@tanstack/react-query';

export function CrossAppBadge({ entityId }: { entityId: UUID }) {
  const { data: relations } = useQuery({
    queryKey: ['cross-app', 'relations', entityId],
    queryFn: () =>
      api.get<Array<{ id: string; app: string; deal_id?: number; url?: string }>>(
        '/api/v1/cross-app/relations',
        { params: { entityId } }
      ),
  });

  const cinqRelation = relations?.find((r) => r.app === 'cinq');

  if (!cinqRelation) return null;

  return (
    <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
      <a
        href={cinqRelation.url || `/crm/deals/${cinqRelation.deal_id}`}
        target="_blank"
        rel="noreferrer"
        className="hover:underline"
      >
        <Trans>Reserved for CINQ deal #{cinqRelation.deal_id}</Trans>
      </a>
    </Badge>
  );
}
