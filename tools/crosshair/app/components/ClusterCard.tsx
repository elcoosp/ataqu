'use client';

import { cn } from '@/lib/utils';

interface ClusterCardProps {
  cluster: any;
  onView: (cluster: any) => void;
}

export function ClusterCard({ cluster, onView }: ClusterCardProps) {
  const score = cluster.total_opportunity_score || 0;
  const scoreColor = score >= 70 ? 'text-green-600' : score >= 40 ? 'text-yellow-600' : 'text-red-600';

  const verdictColor = {
    'build_test': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    'watch': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    'ignore': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    'needs_research': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  }[cluster.verdict || 'needs_research'];

  const bestQuotes = cluster.best_quotes ? JSON.parse(cluster.best_quotes) : [];

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-lg">{cluster.name}</h3>
        <span className={cn('px-2 py-0.5 rounded text-xs font-medium', verdictColor)}>
          {cluster.verdict}
        </span>
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
        {cluster.core_pain}
      </div>
      <div className="flex items-center gap-4 text-sm text-gray-500">
        <span>App: <span className="font-medium">{cluster.mapped_app}</span></span>
        <span>Evidence: <span className="font-medium">{cluster.evidence_count}</span></span>
        <span className={cn('font-semibold', scoreColor)}>Score: {score}</span>
      </div>
      {bestQuotes.length > 0 && (
        <div className="mt-2 text-sm italic text-gray-500 border-l-2 border-gray-300 pl-2">
          “{bestQuotes[0]}”
        </div>
      )}
      <div className="mt-3 flex justify-end">
        <button
          onClick={() => onView(cluster)}
          className="text-blue-600 hover:underline text-sm"
        >
          View Details →
        </button>
      </div>
    </div>
  );
}
