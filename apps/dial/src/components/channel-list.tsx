import { ChannelSummary } from '@ataqu/api-client';
import { useDebounce } from '@ataqu/shared-hooks';
import { Button, cn, Input, Skeleton } from '@ataqu/ui';
import { useMemo, useState } from 'react';
import { useDialStore } from '@/stores/dial-store';

export function ChannelList() {
  const { activeChannelId } = useDialStore();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const { data: channels, isLoading } = useListChannels();

  const filteredChannels = useMemo(() => {
    if (!channels) return [];
    if (!debouncedSearch) return channels;
    return channels.filter((c: ChannelSummary) =>
      c.name.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
  }, [channels, debouncedSearch]);

  // Separate public/private and DMs
  const publicChannels = filteredChannels.filter(
    (c: ChannelSummary) => c.channel_type === 'public'
  );
  const privateChannels = filteredChannels.filter(
    (c: ChannelSummary) => c.channel_type === 'private'
  );
  const dmChannels = filteredChannels.filter(
    (c: ChannelSummary) => c.channel_type === 'direct_message'
  );

  const handleCreateChannel = () => {
    // This will be handled by a modal; we'll open a modal from the parent.
    // We'll just navigate to a creation route or use a dialog.
    // For now, we'll trigger an event that the parent can catch.
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

  if (!channels.length) {
    return (
      <div className="p-4">
        <EmptyState
          icon={Hash}
          title="No channels yet"
          description="Connect DIAL to CINQ, or create your first channel."
          ctaLabel="Create Channel"
          onCta={handleCreateChannel}
        />
      </div>
    );
  }

  const renderChannel = (channel: ChannelSummary) => {
    const isActive = activeChannelId === channel.id;
    let icon = <Hash className="h-4 w-4" />;
    if (channel.channel_type === 'private') icon = <Lock className="h-4 w-4" />;
    if (channel.channel_type === 'direct_message') icon = <Users className="h-4 w-4" />;

    // For DMs, show presence dot
    const _presenceDot = null;
    if (channel.channel_type === 'direct_message') {
      // Assume channel name is the other user's name or we need to fetch participants
      // For simplicity, we'll use the first participant that is not the current user
      // but we don't have participants in the summary. We'll skip presence for now.
    }

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
        <span className="flex-1 truncate text-sm font-medium">{channel.name}</span>
        {channel.unread_count > 0 && (
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
            placeholder="Search channels..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm bg-background"
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={handleCreateChannel}
        >
          <Plus className="h-4 w-4 mr-2" /> Create Channel
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {publicChannels.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-muted-foreground px-2 py-1">Channels</div>
            {publicChannels.map(renderChannel)}
          </div>
        )}
        {privateChannels.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-muted-foreground px-2 py-1">Private</div>
            {privateChannels.map(renderChannel)}
          </div>
        )}
        {dmChannels.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-muted-foreground px-2 py-1">
              Direct Messages
            </div>
            {dmChannels.map(renderChannel)}
          </div>
        )}
      </div>
    </div>
  );
}
