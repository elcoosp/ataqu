import { useState, useEffect, useRef } from 'react';
import { useUpdateDocument, useDeleteDocument } from '@ataqu/api-client';
import { useIdempotency } from '@ataqu/shared-hooks';
import { handleApiError } from '@ataqu/shared-utils';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Trans } from '@lingui/react/macro';
import { i18n } from '@lingui/core';
import { Button } from '@ataqu/ui';
import { FileDown, Copy, Trash2 } from 'lucide-react';
import type { Document } from '@/types';

interface DocumentEditorProps {
  id: string;
  initialDoc: Document;
  onDelete?: () => void;
  onDuplicate?: () => void;
}

export function DocumentEditor({ id, initialDoc, onDelete, onDuplicate }: DocumentEditorProps) {
  const { getKey } = useIdempotency();
  const [title, setTitle] = useState(initialDoc.title);
  const [content, setContent] = useState(initialDoc.content);
  const [version, setVersion] = useState(initialDoc.version);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const updateMutation = useUpdateDocument({
    onSuccess: (data) => {
      setVersion(data.version);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 1500);
    },
    onError: (error) => {
      toast.error(handleApiError(error));
      setSaveStatus('idle');
    },
  });

  const deleteMutation = useDeleteDocument({
    onSuccess: () => {
      toast.success(<Trans>Document deleted.</Trans>);
      onDelete?.();
    },
    onError: (error) => toast.error(handleApiError(error)),
  });

  useEffect(() => {
    if (title === initialDoc.title && content === initialDoc.content) return;
    setSaveStatus('saving');
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      updateMutation.mutate(
        { id, data: { title, content, version } },
        { headers: { 'Idempotency-Key': getKey() } }
      );
    }, 500);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [title, content, version, initialDoc, updateMutation, id, getKey]);

  const handleDelete = () => {
    deleteMutation.mutate(id, { headers: { 'Idempotency-Key': getKey() } });
  };

  const handleExport = () => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(<Trans>Exported.</Trans>);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-2 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {saveStatus === 'saving' && <Trans>Saving…</Trans>}
            {saveStatus === 'saved' && <Trans>Saved.</Trans>}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <FileDown className="h-4 w-4 mr-1" />
            <Trans>Export</Trans>
          </Button>
          <Button variant="outline" size="sm" onClick={onDuplicate}>
            <Copy className="h-4 w-4 mr-1" />
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="flex-1 grid grid-cols-2 divide-x divide-border">
        <div className="flex flex-col">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-transparent text-lg font-medium border-none outline-none p-2"
            placeholder={i18n._('Document title')}
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="flex-1 p-2 bg-background font-mono text-sm resize-none outline-none"
            placeholder={i18n._('Write markdown here…')}
          />
        </div>
        <div className="p-4 bg-card overflow-auto prose prose-sm prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
