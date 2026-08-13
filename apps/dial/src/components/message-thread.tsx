import { useAddReaction, useListMessages } from '@ataqu/api-client';
import { Avatar, AvatarFallback, Button, cn, Skeleton } from '@ataqu/ui';
import { t } from '@lingui/macro';
import { useVirtualizer } from '@tanstack/react-virtual';
import { formatDistanceToNow } from 'date-fns';
import { Reply } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { MessageInput } from './message-input';
import { ReactionPicker } from './reaction-picker';
import { ThreadSidebar } from './thread-sidebar';

interface MessageThreadProps {
  channelId: string;
}

export function MessageThread({ channelId }: MessageThreadProps) {
  const { data: messagesData, isLoading } = useListMessages(channelId, { limit: 50, offset: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const allMessages = (messagesData?.messages ?? []).filter((m) => m != null);

  // Virtualization
  const virtualizer = useVirtualizer({
    count: allMessages.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 60,
    overscan: 10,
  });

  // Scroll to bottom on new messages
  useEffect(() => {
    if (virtualizer) {
      virtualizer.scrollToIndex(allMessages.length - 1, { align: 'end' });
    }
  }, [allMessages.length, virtualizer]);

  // Handle reactions
  const addReactionMutation = useAddReaction();

  const handleReactionToggle = (messageId: string, emoji: string) => {
    addReactionMutation.mutate({
      messageId,
      data: { emoji },
    });
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-10 w-2/3" />
      </div>
    );
  }

  if (!allMessages.length) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        {t`No messages yet. Say hello!`}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-2 border-b border-border flex items-center gap-2">
        <input
          data-search-input
          type="text"
          placeholder={t`Search messages...`}
          className="flex-1 px-3 py-1 text-sm bg-background border border-input rounded-md"
          onChange={(e) => {
            // We'll implement search via API and filter messages
          }}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(`/api/dial/channels/${channelId}/export`)}
        >
          {t`Export CSV`}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(`/api/dial/channels/${channelId}/export/pdf`)}
        >
          {t`Export PDF`}
        </Button>
      </div>
      <div ref={containerRef} className="flex-1 overflow-y-auto">
        <div className="relative" style={{ height: `${virtualizer.getTotalSize()}px` }}>
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const message = allMessages[virtualRow.index];
            if (!message) return null;
            const isOwn = message.author_id === 'current-user-id'; // TODO: get from auth
            return (
              <div
                key={message.id}
                className={cn(
                  'flex px-4 py-2 hover:bg-card/50 transition-colors',
                  isOwn ? 'justify-end' : 'justify-start'
                )}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div className={cn('max-w-[80%]', isOwn ? 'bg-primary/10 rounded-md p-2' : '')}>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Avatar className="h-6 w-6 rounded-md">
                      <AvatarFallback className="rounded-md text-xs bg-muted">
                        {message.author_id.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-foreground">{message.author_id}</span>
                    <span>
                      {formatDistanceToNow(new Date(message.sent_at), { addSuffix: true })}
                    </span>
                  </div>
                  <div className="mt-1 text-sm whitespace-pre-wrap break-words">
                    {message.content.split(' ').map((word, i) => {
                      if (word.startsWith('@')) {
                        return (
                          <span
                            key={i}
                            className="bg-primary/20 text-primary-foreground px-0.5 rounded"
                          >
                            {word}
                          </span>
                        );
                      }
                      return word + ' ';
                    })}
                  </div>
                  {/* Reactions */}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(() => {
                      const { data: reactions } = useListReactions(message.id);
                      return reactions?.map((r) => (
                        <span
                          key={r.id}
                          className="text-xs bg-muted/30 px-1.5 py-0.5 rounded cursor-pointer hover:bg-muted/50"
                          onClick={() => {
                            // Toggle reaction: if user already reacted, delete it
                            const userReaction = reactions.find(
                              (r) => r.user_id === 'current-user-id' && r.emoji === r.emoji
                            );
                            if (userReaction) {
                              deleteReactionMutation.mutate({
                                messageId: message.id,
                                reactionId: userReaction.id,
                              });
                            } else {
                              addReactionMutation.mutate({
                                messageId: message.id,
                                data: { emoji: r.emoji },
                              });
                            }
                          }}
                        >
                          {r.emoji}
                        </span>
                      ));
                    })()}
                  </div>
                  {/* Action buttons: reaction, reply */}
                  <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ReactionPicker onSelect={(emoji) => handleReactionToggle(message.id, emoji)} />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => {
                        window.dispatchEvent(
                          new CustomEvent('openThread', { detail: { messageId: message.id } })
                        );
                      }}
                    >
                      <Reply className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="border-t border-border p-2">
        <MessageInput channelId={channelId} />
      </div>
      {/* Thread sidebar will be rendered conditionally */}
      <ThreadSidebar channelId={channelId} />
    </div>
  );
}
