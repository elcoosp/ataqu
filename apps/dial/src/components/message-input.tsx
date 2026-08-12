import { useSendMessage } from '@ataqu/api-client';
import { useIdempotency } from '@ataqu/shared-hooks';
import { Button } from '@ataqu/ui';
import { Loader2, Paperclip, Send } from 'lucide-react';
import { t } from '@lingui/macro';
import { useEffect, useRef, useState } from 'react';

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
  const sendMessage = useSendMessage();

  const handleSend = async () => {
    if (!content.trim() || isSending) return;
    const trimmed = content.trim();
    setIsSending(true);
    try {
      // Optimistic: add message to UI via WebSocket or cache update
      // We'll rely on the WebSocket to broadcast and update cache.
      // But we can also manually update the cache.
      await sendMessage.mutateAsync({
        channelId,
        data: { content: trimmed },
      });
      setContent('');
      resetKey();
    } catch (error) {
      // Rollback: the mutation will handle error state
      console.error('Failed to send message', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    // Auto-resize
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, []);

  return (
    <div className="flex items-end gap-2">
      <div className="flex-1 relative">
        <textarea
          className="resize-none min-h-[40px] max-h-[200px] bg-background border border-input rounded-md px-3 py-2 text-sm"
          ref={textareaRef}
          value={content}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
        />
        <div className="absolute right-2 bottom-1 text-xs text-muted-foreground">
          {content.length}/4000
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-full"
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <Paperclip className="h-4 w-4" />
      </Button>
      <input id="file-input" type="file" className="hidden" multiple />
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
