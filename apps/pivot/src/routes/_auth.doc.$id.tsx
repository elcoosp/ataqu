import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useGetDocument, useUpdateDocument, useDeleteDocument } from '@ataqu/api-client';
import { useIdempotency } from '@ataqu/shared-hooks';
import { Button } from '@ataqu/ui';
import { Trans } from '@lingui/react/macro';
import { toast } from 'sonner';
import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FileDown, Copy, Trash2, Clock } from 'lucide-react';

export const Route = createFileRoute('/_auth/doc/$id')({
  component: DocumentDetail,
});

function DocumentDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: doc, refetch } = useGetDocument(id);
  const { mutate: updateDoc } = useUpdateDocument();
  const { mutate: deleteDoc } = useDeleteDocument();
  const { getKey } = useIdempotency();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [version, setVersion] = useState(0);
  const [saveStatus, setSaveStatus] = useState<'idle'|'saving'|'saved'>('idle');
  const timerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (doc) {
      setTitle(doc.title);
      setContent(doc.content);
      setVersion(doc.version);
    }
  }, [doc]);

  useEffect(() => {
    if (!doc) return;
    if (title === doc.title && content === doc.content) return;
    setSaveStatus('saving');
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      updateDoc(
        { id, data: { title, content } },
        {
          headers: { 'Idempotency-Key': getKey() },
          onSuccess: (data) => {
            setVersion(data.version);
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 1500);
          },
          onError: () => {
            toast.error(<Trans>Failed to save.</Trans>);
            setSaveStatus('idle');
          },
        }
      );
    }, 500);
    return () => clearTimeout(timerRef.current);
  }, [title, content, id, doc, updateDoc, getKey]);

  const handleDelete = () => {
    deleteDoc(
      id,
      {
        headers: { 'Idempotency-Key': getKey() },
        onSuccess: () => {
          toast.success(<Trans>Document deleted.</Trans>);
          navigate({ to: '/' });
        },
      }
    );
  };

  const handleDuplicate = () => {
    // Would need to call createDocument with copy; stub for now
    toast.info(<Trans>Duplicate feature coming soon.</Trans>);
  };

  const handleExport = () => {
    if (!doc) return;
    const blob = new Blob([doc.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.title}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(<Trans>Exported.</Trans>);
  };

  if (!doc) return <div><Trans>Loading…</Trans></div>;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-2 border-b border-border">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/' })}>← <Trans>Back</Trans></Button>
          <span className="text-xs text-muted-foreground">{saveStatus === 'saving' && <Trans>Saving…</Trans>}{saveStatus === 'saved' && <Trans>Saved.</Trans>}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}><FileDown className="h-4 w-4 mr-1" /><Trans>Export</Trans></Button>
          <Button variant="outline" size="sm" onClick={handleDuplicate}><Copy className="h-4 w-4 mr-1" /></Button>
          <Button variant="destructive" size="sm" onClick={handleDelete}><Trash2 className="h-4 w-4" /></Button>
        </div>
      </div>
      <div className="flex-1 grid grid-cols-2 divide-x divide-border">
        <div className="flex flex-col">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-transparent text-lg font-medium border-none outline-none p-2"
            placeholder="Document title"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="flex-1 p-2 bg-background font-mono text-sm resize-none outline-none"
            placeholder="Write markdown here…"
          />
        </div>
        <div className="p-4 bg-card overflow-auto prose prose-sm prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
