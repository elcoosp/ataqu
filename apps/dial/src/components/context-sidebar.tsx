import { useGetChannel } from '@ataqu/api-client';
import { Badge, Skeleton } from '@ataqu/ui';
import { t } from '@lingui/macro';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { DollarSign, User } from 'lucide-react';
import { getCinqContext } from '@/api/cinq-context';

interface ContextSidebarProps {
  channelId: string;
}

export function ContextSidebar({ channelId }: ContextSidebarProps) {
  const { data: channel, isLoading: channelLoading } = useGetChannel(channelId);
  const { data: cinqContext } = useQuery({
    queryKey: ['cinq-context', channelId],
    queryFn: () => getCinqContext(channelId),
    enabled: !!channelId,
  });

  if (channelLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  if (!channel) return null;

  return (
    <div className="p-4 border-l border-border h-full bg-card/30">
      <h3 className="text-sm font-semibold text-foreground mb-4">{t`Channel Info`}</h3>
      <div className="space-y-2 text-sm text-muted-foreground">
        <p>
          <span className="font-medium">{t`Name:`}</span> {channel.name}
        </p>
        <p>
          <span className="font-medium">{t`Type:`}</span> {channel.channel_type}
        </p>
        <p>
          <span className="font-medium">{t`Created:`}</span>{' '}
          {new Date(channel.created_at).toLocaleDateString()}
        </p>
      </div>

      {cinqContext && (
        <div className="mt-4 p-3 bg-primary/10 rounded-md border border-primary/20">
          <Badge variant="default" className="mb-2">
            Linked to CINQ
          </Badge>
          <Link to={'/dashboard'} className="block text-sm hover:underline">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="font-medium">{cinqContext.name}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <span>Amount: ${cinqContext.amount}</span>
              <span>·</span>
              <span>Stage: {cinqContext.stage}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <User className="h-3 w-3" />
              <span>{cinqContext.contact_name}</span>
              <span>·</span>
              <span>{cinqContext.contact_email}</span>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}
