import { createFileRoute } from '@tanstack/react-router';
import { useGetDocument, useDeleteDocument } from '@/api';
import { Button } from '@ataqu/ui';
import { Trans } from '@lingui/react/macro';
import { DocumentEditor } from '@/components/document-editor';
import { VersionHistory } from '@/components/version-history';
import { TemplatePicker } from '@/components/template-picker';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { FileDown, Copy, Trash2, Link as LinkIcon } from 'lucide-react';
import { useIdempotency } from '@ataqu/shared-hooks';
import { useState } from 'react';
import { api } from '@ataqu/api-client';

export const Route = createFileRoute('/_auth/doc/$id')({
  component: DocumentDetail,
});

function DocumentDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: doc, refetch } = useGetDocument(id);
  const { mutate: deleteDoc } = useDeleteDocument();
  const { getKey } = useIdempotency();
  const [showVersions, setShowVersions] = useState(false);

  const handleDelete = () => {
    deleteDoc(
      { id, headers: { 'Idempotency-Key': getKey() } },
      {
        onSuccess: () => {
          toast.success(<Trans>Document deleted.</Trans>);
          navigate({ to: '/' });
        },
      }
    );
  };

  const handleDuplicate = () => {
    // create copy
    const newDoc = { title: `${doc.title} (copy)`, content: doc.content };
    api.post('/docs', newDoc, { headers: { 'Idempotency-Key': getKey() } }).then(() => {
      toast.success(<Trans>Document duplicated.</Trans>);
      refetch();
    });
  };

  const handleExport = () => {
    const blob = new Blob([doc.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.title}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(<Trans>Exported as Markdown.</Trans>);
  };

  if (!doc) return <div><Trans>Loading…</Trans></div>;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-2 border-b border-border gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/' })}>
            ← <Trans>Back</Trans>
          </Button>
          <TemplatePicker documentId={id} onApplied={refetch}>
            <Button variant="outline" size="sm"><Trans>Apply Template</Trans></Button>
          </TemplatePicker>
          <Button variant="outline" size="sm" onClick={() => setShowVersions(!showVersions)}>
            <Trans>Toggle Version History</Trans>
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <FileDown className="h-4 w-4 mr-1" />
            <Trans>Export Markdown</Trans>
          </Button>
          <Button variant="outline" size="sm" onClick={handleDuplicate}>
            <Copy className="h-4 w-4 mr-1" />
            <Trans>Duplicate</Trans>
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-1" />
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1">
          <DocumentEditor
            documentId={id}
            initialTitle={doc.title}
            initialContent={doc.content}
            initialVersion={doc.version}
            className="h-full"
          />
        </div>
        {showVersions && (
          <div className="w-80 border-l border-border p-2">
            <VersionHistory documentId={id} currentVersion={doc.version} onRestore={refetch} />
          </div>
        )}
      </div>
    </div>
  );
}
