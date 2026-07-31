'use client';

import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from './ui/Dialog';

interface ClusterDetailProps {
  cluster: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClusterDetail({ cluster, open, onOpenChange }: ClusterDetailProps) {
  if (!cluster) return null;

  const bestQuotes = cluster.best_quotes ? JSON.parse(cluster.best_quotes) : [];
  const competitors = cluster.competitors_mentioned ? JSON.parse(cluster.competitors_mentioned) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>{cluster.name}</DialogTitle>
      </DialogHeader>
      <DialogContent>
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Core Pain</h3>
            <p className="text-sm">{cluster.core_pain}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Common Workarounds</h3>
            <p className="text-sm">{cluster.common_workarounds || 'N/A'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Manual MVP Idea</h3>
            <p className="text-sm">{cluster.manual_mvp_idea || 'N/A'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Sample Quotes</h3>
            <ul className="list-disc pl-5 text-sm space-y-1">
              {bestQuotes.map((q: string, i: number) => (
                <li key={i}>“{q}”</li>
              ))}
              {bestQuotes.length === 0 && <li>No quotes available</li>}
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm font-medium text-gray-500">App</span>
              <div className="text-sm">{cluster.mapped_app}</div>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Evidence Count</span>
              <div className="text-sm">{cluster.evidence_count}</div>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Opportunity Score</span>
              <div className="text-sm font-semibold">{cluster.total_opportunity_score}</div>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Competitors</span>
              <div className="text-sm">{competitors.join(', ') || 'N/A'}</div>
            </div>
          </div>
        </div>
      </DialogContent>
      <DialogFooter>
        <button
          onClick={() => onOpenChange(false)}
          className="px-4 py-2 border rounded-md text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          Close
        </button>
      </DialogFooter>
    </Dialog>
  );
}
