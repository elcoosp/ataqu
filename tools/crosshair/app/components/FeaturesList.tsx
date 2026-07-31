import { clusters } from '@/db/schema';
import { InferSelectModel } from 'drizzle-orm';

type Cluster = InferSelectModel<typeof clusters>;

export function FeaturesList({ clusters }: { clusters: Cluster[] }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
      <h2 className="text-xl font-semibold mb-4">Top Features to Build</h2>
      {clusters.length === 0 ? (
        <p className="text-gray-500">No clusters yet. Run the pipeline.</p>
      ) : (
        <ul className="space-y-4">
          {clusters.map((cluster) => (
            <li key={cluster.id} className="border-b border-gray-100 dark:border-gray-800 pb-3 last:border-0">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{cluster.name}</h3>
                  <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded">
                    {cluster.verdict}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {cluster.core_pain}
                </p>
                <div className="flex gap-4 mt-2 text-xs text-gray-500">
                  <span>Evidence: {cluster.evidence_count} complaints</span>
                  <span>Score: {cluster.total_opportunity_score}/100</span>
                  <span>App: {cluster.mapped_app}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
