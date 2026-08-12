import { useState } from 'react';
import { useListDocumentVersions, useGetDocument, useUpdateDocument } from '@/api';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@ataqu/ui';
import { Button } from '@ataqu/ui';
import { Clock, RotateCcw } from 'lucide-react';
import { Trans } from '@lingui/react/macro';
import { formatDate } from '@ataqu/shared-utils';
import { useIdempotency } from '@ataqu/shared-hooks';
import { toast } from 'sonner';

interface VersionHistoryProps {
  documentId: string;
  currentVersion: number;
  onRestore?: () => void;
}

export function VersionHistory({ documentId, currentVersion, onRestore }: VersionHistoryProps) {
  const [open, setOpen] = useState(false);
  const { data: versions, isLoading } = useListDocumentVersions(documentId, { limit: 50 });
  const { mutate: updateDoc } = useUpdateDocument();
  const { getKey } = useIdempotency();

  const handleRestore = (versionId: string, content: string, title: string, version: number) => {
    updateDoc(
      {
        id: documentId,
        data: { title, content, version: version },
        headers: { 'Idempotency-Key': getKey() },
      },
      {
        onSuccess: () => {
          toast.success(<Trans>Version restored.</Trans>);
          onRestore?.();
          setOpen(false);
        },
        onError: () => toast.error(<Trans>Failed to restore version.</Trans>),
      }
    );
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Clock className="mr-2 h-4 w-4" />
          <Trans>Version History</Trans>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle><Trans>Version History</Trans></SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-2">
          {isLoading && <p><Trans>Loading…</Trans></p>}
          {versions?.map((v: any) => (
            <div key={v.id} className="flex items-center justify-between p-2 border-b border-border">
              <div>
                <p className="text-sm font-medium">{v.title}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(v.created_at)} • v{v.version}
                </p>
              </div>
              {v.version !== currentVersion && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRestore(v.id, v.content, v.title, v.version)}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
