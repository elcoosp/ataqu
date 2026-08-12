import { useState } from 'react';
import { Trans } from '@lingui/react/macro';
import { t } from '@lingui/core/macro';
import { Button, Label } from '@ataqu/ui';
import { Play, X, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useExecuteWorkflow } from '../api/spark-api';

interface TestRunModalProps {
  workflowId: string;
  onClose: () => void;
}

export function TestRunModal({ workflowId, onClose }: TestRunModalProps) {
  const [payload, setPayload] = useState('{\n  "test": true\n}');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const executeMutation = useExecuteWorkflow();

  const handleRun = () => {
    try {
      const parsed = JSON.parse(payload) as Record<string, unknown>;
      setJsonError(null);
      executeMutation.mutate(
        { id: workflowId, data: { payload: parsed } },
        {
          onSuccess: () => {
            toast.success(t`Test run completed.`);
            onClose();
          },
          onError: () => {
            toast.error(t`Test run failed.`);
          },
        }
      );
    } catch {
      setJsonError(t`Invalid JSON`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" role="dialog" aria-modal="true">
      <div className="ataqu-glass w-full max-w-lg rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-heading font-bold text-foreground">
            <Trans>Test Run</Trans>
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="test-payload"><Trans>Test Payload (JSON)</Trans></Label>
            <textarea
              id="test-payload"
              className="w-full mt-1 p-3 rounded-md border border-border bg-background text-foreground text-sm font-mono h-48 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={payload}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                setPayload(e.target.value);
                setJsonError(null);
              }}
              spellCheck={false}
            />
            {jsonError && (
              <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                <XCircle className="h-3 w-3" />
                {jsonError}
              </p>
            )}
          </div>

          {executeMutation.isSuccess && (
            <div className="p-3 rounded-md bg-green-500/20 border border-green-500/30 text-green-400 text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              <Trans>Test run completed successfully.</Trans>
            </div>
          )}

          {executeMutation.isError && (
            <div className="p-3 rounded-md bg-red-500/20 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              <Trans>Test run failed. Check the execution history for details.</Trans>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>
              <Trans>Cancel</Trans>
            </Button>
            <Button
              onClick={handleRun}
              disabled={executeMutation.isPending || !!jsonError}
            >
              <Play className="mr-2 h-4 w-4" />
              {executeMutation.isPending ? <Trans>Running...</Trans> : <Trans>Run Test</Trans>}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
