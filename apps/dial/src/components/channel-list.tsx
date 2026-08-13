import { type ChannelSummary, useListChannels } from '@ataqu/api-client';
import { useDebounce } from '@ataqu/shared-hooks';
import { Button, cn, Input, Skeleton } from '@ataqu/ui';
import { t } from '@lingui/macro';
import { Link } from '@tanstack/react-router';
import { Hash, Lock, Plus, Search, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useDialStore } from '@/stores/dial-store';

// Local type that matches the actual API response (which includes type and unread_count)
type ExtendedChannel = ChannelSummary & {
  type?: 'public' | 'private' | 'direct_message';
  unread_count?: number;
};

export function ChannelList() {
  const { activeChannelId } = useDialStore();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const { data: channels, isLoading } = useListChannels();

  // Cast to ExtendedChannel array
  const extendedChannels = (channels ?? []) as ExtendedChannel[];

  const filteredChannels = useMemo(() => {
    if (!extendedChannels.length) return [];
    if (!debouncedSearch) return extendedChannels;
    return extendedChannels.filter((c) =>
      c.name.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
  }, [extendedChannels, debouncedSearch]);

  const publicChannels = filteredChannels.filter((c) => c.type === 'public');
  const privateChannels = filteredChannels.filter((c) => c.type === 'private');
  const dmChannels = filteredChannels.filter((c) => c.type === 'direct_message');

  const handleCreateChannel = () => {
    window.dispatchEvent(new CustomEvent('openCreateChannelDialog'));
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-8 w-1/2" />
      </div>
    );
  }

  if (!channels?.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <Hash className="h-12 w-12 mb-4 text-muted-foreground/20" />
        <p className="text-lg font-medium text-muted-foreground">{t`No channels yet`}</p>
        <p className="text-sm text-muted-foreground">{t`Connect DIAL to CINQ, or create your first channel.`}</p>
        <Button variant="outline" className="mt-4" onClick={handleCreateChannel}>
          <Plus className="h-4 w-4 mr-2" /> {t`Create Channel`}
        </Button>
      </div>
    );
  }

  const renderChannel = (channel: ExtendedChannel) => {
    const isActive = activeChannelId === channel.id;
    let icon = <Hash className="h-4 w-4" />;
    if (channel.type === 'private') icon = <Lock className="h-4 w-4" />;
    if (channel.type === 'direct_message') icon = <Users className="h-4 w-4" />;

    const presenceDot =
      channel.type === 'direct_message' ? (
        <span
          className={`w-2 h-2 rounded-full mr-1 ${(channel as any).participants?.some((p: string) => useDialStore.getState().presenceMap[p] === 'online') ? 'bg-success' : 'bg-muted'}`}
        />
      ) : null;
    return (
      <Link
        key={channel.id}
        to="/channels/$id"
        params={{ id: channel.id }}
        className={cn(
          'flex items-center px-3 py-2 rounded-md transition-colors',
          isActive ? 'bg-card text-foreground' : 'hover:bg-card/50 text-muted-foreground'
        )}
        activeProps={{ className: 'bg-card text-foreground' }}
      >
        <span className="mr-2">{icon}</span>
        {presenceDot}
        <span className="flex-1 truncate text-sm font-medium">{channel.name}</span>
        {(channel.unread_count ?? 0) > 0 && (
          <span className="ml-auto bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
            {channel.unread_count}
          </span>
        )}
      </Link>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t`Search channels...`}
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm bg-background"
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={handleCreateChannel}
        >
          <Plus className="h-4 w-4 mr-2" /> {t`Create Channel`}
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {publicChannels.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-muted-foreground px-2 py-1">{t`Channels`}</div>
            {publicChannels.map(renderChannel)}
          </div>
        )}
        {privateChannels.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-muted-foreground px-2 py-1">{t`Private`}</div>
            {privateChannels.map(renderChannel)}
          </div>
        )}
        {dmChannels.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-muted-foreground px-2 py-1">{t`Direct Messages`}</div>
            {dmChannels.map(renderChannel)}
          </div>
        )}
      </div>
    </div>
  );
}
