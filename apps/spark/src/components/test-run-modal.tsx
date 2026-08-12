import { useState } from 'react';
import { Trans } from '@lingui/react/macro';
import { Button } from '@ataqu/ui';
import { useExecuteWorkflow } from '../api/hooks';

interface TestRunModalProps {
  workflowId: string;
  onClose: () => void;
}

export function TestRunModal({ workflowId, onClose }: TestRunModalProps) {
  const [payload, setPayload] = useState('{}');
  const [result, setResult] = useState<string | null>(null);
  const executeMutation = useExecuteWorkflow();

  const handleRun = () => {
    try {
      const parsed = JSON.parse(payload) as Record<string, unknown>;
      executeMutation.mutate(
        { id: workflowId, payload: parsed },
        {
          onSuccess: () => setResult('success'),
          onError: () => setResult('failed'),
        }
      );
    } catch {
      setResult('invalid_json');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" role="dialog" aria-modal="true">
      <div className="ataqu-glass w-full max-w-md rounded-lg p-6">
        <h2 className="text-lg font-heading font-bold text-foreground mb-4"><Trans>Test Run</Trans></h2>
        <label className="text-sm text-muted-foreground block mb-1"><Trans>Payload (JSON)</Trans></label>
        <textarea
          className="font-mono text-sm h-32 mb-4"
          value={payload}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPayload(e.target.value)}
        />
        {result === 'success' && <p className="text-sm text-green-500 mb-2"><Trans>Test run completed.</Trans></p>}
        {result === 'failed' && <p className="text-sm text-red-500 mb-2"><Trans>Test run failed.</Trans></p>}
        {result === 'invalid_json' && <p className="text-sm text-red-500 mb-2"><Trans>Invalid JSON payload.</Trans></p>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}><Trans>Cancel</Trans></Button>
          <Button onClick={handleRun} disabled={executeMutation.isPending}>
            {executeMutation.isPending ? <Trans>Running...</Trans> : <Trans>Run</Trans>}
          </Button>
        </div>
      </div>
    </div>
  );
}
