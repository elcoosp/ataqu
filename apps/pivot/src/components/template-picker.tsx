import { useState } from 'react';
import { useListTemplates, useApplyTemplate } from '@/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@ataqu/ui';
import { Button } from '@ataqu/ui';
import { Trans } from '@lingui/react/macro';
import { toast } from 'sonner';
import { useIdempotency } from '@ataqu/shared-hooks';

interface TemplatePickerProps {
  documentId: string;
  onApplied?: () => void;
  children: React.ReactNode;
}

export function TemplatePicker({ documentId, onApplied, children }: TemplatePickerProps) {
  const [open, setOpen] = useState(false);
  const { data: templates, isLoading } = useListTemplates();
  const { mutate: applyTemplate } = useApplyTemplate();
  const { getKey } = useIdempotency();

  const handleApply = (templateId: string) => {
    applyTemplate(
      { id: templateId, headers: { 'Idempotency-Key': getKey() } },
      {
        onSuccess: () => {
          toast.success(<Trans>Template applied.</Trans>);
          onApplied?.();
          setOpen(false);
        },
        onError: () => toast.error(<Trans>Failed to apply template.</Trans>),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle><Trans>Apply Template</Trans></DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 mt-4">
          {isLoading && <p><Trans>Loading templates…</Trans></p>}
          {templates?.map((t: any) => (
            <div key={t.id} className="border border-border rounded p-3 hover:border-primary cursor-pointer" onClick={() => handleApply(t.id)}>
              <h4 className="font-medium">{t.name}</h4>
              <p className="text-sm text-muted-foreground truncate">{t.content}</p>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
