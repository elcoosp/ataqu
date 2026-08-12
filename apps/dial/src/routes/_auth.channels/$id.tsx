import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { ChannelList } from '@/components/channel-list';
import { ContextSidebar } from '@/components/context-sidebar';
import { MessageThread } from '@/components/message-thread';
import { useDialStore } from '@/stores/dial-store';

export const Route = createFileRoute('/_auth/channels/$id')({
  component: ChannelDetail,
});

function ChannelDetail() {
  const { id } = Route.useParams();
  const { setActiveChannel } = useDialStore();

  useEffect(() => {
    setActiveChannel(id);
    return () => setActiveChannel(null);
  }, [id, setActiveChannel]);

  return (
    <div className="flex h-full">
      <div className="w-64 border-r border-border flex-shrink-0">
        <ChannelList />
      </div>
      <div className="flex-1 flex">
        <div className="flex-1 flex flex-col">
          <MessageThread channelId={id} />
        </div>
        <div className="w-72 flex-shrink-0">
          <ContextSidebar channelId={id} />
        </div>
      </div>
    </div>
  );
}
