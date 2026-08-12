import { useState } from 'react';
import { Trans } from '@lingui/react/macro';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@ataqu/ui';
import { EmptyState } from './empty-state';
import { useReplayDLQ, useDeleteDLQ, type DLQEntry } from '../api/hooks';

interface DLQViewerProps {
  entries: DLQEntry[];
}

export function DLQViewer({ entries }: DLQViewerProps) {
  const replayMutation = useReplayDLQ();
  const deleteMutation = useDeleteDLQ();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="No dead-letter events"
        description="All workflows are healthy."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm text-left">
        <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
          <tr>
            <th className="px-4 py-3"><Trans>Event Type</Trans></th>
            <th className="px-4 py-3"><Trans>Payload</Trans></th>
            <th className="px-4 py-3"><Trans>Error</Trans></th>
            <th className="px-4 py-3"><Trans>Attempts</Trans></th>
            <th className="px-4 py-3"><Trans>Actions</Trans></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {entries.map((entry) => (
            <tr key={entry.id} className="bg-card hover:bg-accent/50">
              <td className="px-4 py-3 font-mono text-xs">{entry.event_type}</td>
              <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">
                {JSON.stringify(entry.payload).slice(0, 60)}
              </td>
              <td className="px-4 py-3 text-xs text-red-500 max-w-[200px] truncate">{entry.error}</td>
              <td className="px-4 py-3">{entry.attempts}</td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => replayMutation.mutate(entry.id)}>
                    <Trans>Replay</Trans>
                  </Button>
                  {confirmId === entry.id ? (
                    <>
                      <Button size="sm" variant="destructive" onClick={() => { deleteMutation.mutate(entry.id); setConfirmId(null); }}>
                        <Trans>Confirm</Trans>
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirmId(null)}>
                        <Trans>Cancel</Trans>
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="destructive" onClick={() => setConfirmId(entry.id)}>
                      <Trans>Delete</Trans>
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
