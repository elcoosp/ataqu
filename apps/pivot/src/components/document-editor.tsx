import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useUpdateDocument } from '@/api';
import { useIdempotency, useDebounce } from '@ataqu/shared-hooks';
import { toast } from 'sonner';
import { Trans } from '@lingui/react/macro';
import { cn } from '@ataqu/ui';

interface DocumentEditorProps {
  documentId: string;
  initialTitle: string;
  initialContent: string;
  initialVersion: number;
  className?: string;
}

export function DocumentEditor({ documentId, initialTitle, initialContent, initialVersion, className }: DocumentEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [version, setVersion] = useState(initialVersion);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const debouncedContent = useDebounce(content, 500);
  const debouncedTitle = useDebounce(title, 500);
  const { mutate: updateDoc } = useUpdateDocument();
  const { getKey } = useIdempotency();
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    if (!isMounted.current) return;
    const hasChanged = debouncedContent !== initialContent || debouncedTitle !== initialTitle;
    if (!hasChanged) return;

    setSaveStatus('saving');
    updateDoc(
      {
        id: documentId,
        data: { title: debouncedTitle, content: debouncedContent, version: version },
        headers: { 'Idempotency-Key': getKey() },
      },
      {
        onSuccess: (data) => {
          if (isMounted.current) {
            setVersion(data.version);
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 1500);
          }
        },
        onError: () => {
          if (isMounted.current) {
            toast.error(<Trans>Failed to save document.</Trans>);
            setSaveStatus('idle');
          }
        },
      }
    );
  }, [debouncedContent, debouncedTitle, documentId, version, initialContent, initialTitle, updateDoc, getKey]);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      <div className="flex items-center justify-between p-2 border-b border-border">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="bg-transparent text-lg font-medium border-none outline-none flex-1"
          placeholder="Document title"
        />
        <span className="text-xs text-muted-foreground">
          {saveStatus === 'saving' && <Trans>Saving…</Trans>}
          {saveStatus === 'saved' && <Trans>Saved.</Trans>}
        </span>
      </div>
      <div className="flex-1 grid grid-cols-2 divide-x divide-border">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="p-4 bg-background font-mono text-sm resize-none outline-none h-full"
          placeholder="Write markdown here…"
        />
        <div className="p-4 bg-card overflow-auto prose prose-sm prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
