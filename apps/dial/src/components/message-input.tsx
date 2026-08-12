import { useSendMessage } from '@ataqu/api-client';
import { useIdempotency } from '@ataqu/shared-hooks';
import { t } from '@lingui/macro';
import { Button } from '@ataqu/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Send } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { FileUpload } from './file-upload';

interface MessageInputProps {
  channelId: string;
  threadId?: string;
  placeholder?: string;
}

export function MessageInput({ channelId, placeholder = t`Type a message...` }: MessageInputProps) {
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { resetKey } = useIdempotency();
  const queryClient = useQueryClient();
  const sendMessage = useSendMessage();

  const mutation = useMutation({
    mutationFn: async (data: { content: string }) => {
      return await sendMessage.mutateAsync({
        channelId,
        data,
      });
    },
    onMutate: async (variables) => {
      // Optimistic update: add message to cache
      const queryKey = ['dial', 'messages', channelId, { limit: 50, offset: 0 }];
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData(queryKey) as { messages: any[]; total: number };
      const optimisticMessage = {
        id: 'optimistic-' + Date.now(),
        content: variables.content,
        author_id: 'current-user-id', // will be replaced later
        sent_at: new Date().toISOString(),
        channel_id: channelId,
        thread_id: null,
        edited_at: null,
        deleted_at: null,
      };
      queryClient.setQueryData(queryKey, {
        ...previous,
        messages: [optimisticMessage, ...(previous?.messages || [])],
        total: (previous?.total || 0) + 1,
      });
      return { previous, optimisticId: optimisticMessage.id };
    },
    onError: (error, variables, context) => {
      // Rollback: remove optimistic message
      const queryKey = ['dial', 'messages', channelId, { limit: 50, offset: 0 }];
      const previous = context?.previous;
      if (previous) {
        queryClient.setQueryData(queryKey, previous);
      } else {
        // If we don't have previous state, just refetch
        queryClient.invalidateQueries({ queryKey });
      }
      toast.error(t`Failed to send message`);
    },
    onSuccess: () => {
      // Invalidate to get the real message
      queryClient.invalidateQueries({ queryKey: ['dial', 'messages', channelId] });
      toast.success(t`Message sent`);
    },
    onSettled: () => {
      setIsSending(false);
      resetKey();
    },
  });

  const handleSend = async () => {
    if (!content.trim() || isSending) return;
    const trimmed = content.trim();
    setIsSending(true);
    setContent('');
    mutation.mutate({ content: trimmed });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  return (
    <div className="flex items-end gap-2">
      <div className="flex-1 relative">
        <textarea
          className="resize-none min-h-[40px] max-h-[200px] bg-background border border-input rounded-md px-3 py-2 text-sm w-full"
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
        />
        <div className="absolute right-2 bottom-1 text-xs text-muted-foreground">
          {content.length}/4000
        </div>
      </div>
      <FileUpload channelId={channelId} />
      <Button
        size="sm"
        className="h-9"
        onClick={handleSend}
        disabled={isSending || !content.trim()}
      >
        {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      </Button>
    </div>
  );
}
