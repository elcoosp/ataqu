import { api } from '@ataqu/api-client';
import { useLocalStorage } from '@ataqu/shared-hooks';
import { Button } from '@ataqu/ui';
import { Trans, t } from '@lingui/react/macro';
import { Download, Play } from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';

export const SqlEditor: React.FC = () => {
  const [sql, setSql] = React.useState('SELECT * FROM contacts LIMIT 10;');
  const [results, setResults] = React.useState<Record<string, unknown>[]>([]);
  const [history, setHistory] = useLocalStorage<string[]>('vista-sql-history', []);
  const [isLoading, setIsLoading] = React.useState(false);

  const runQuery = async () => {
    setIsLoading(true);
    try {
      const res = await api.post<Record<string, unknown>[]>('/vista/explore', { sql });
      setResults(res);
      setHistory((prev) => [sql, ...prev.filter((q) => q !== sql)].slice(0, 10));
      toast.success(t`Query executed.`);
    } catch {
      toast.error(t`Query failed.`);
    } finally {
      setIsLoading(false);
    }
  };

  const exportCsv = () => {
    if (results.length === 0) return;
    const firstRow = results[0] as Record<string, unknown>;
    const headers = Object.keys(firstRow);
    const csv = [
      headers.join(','),
      ...results.map((row) => headers.map((h) => JSON.stringify(row[h] ?? '')).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'query_results.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const columns = results.length > 0 ? Object.keys(results[0] as Record<string, unknown>) : [];

  return (
    <div className="flex h-full">
      <div className="w-64 border-r border-gray-700/40 p-4 overflow-y-auto bg-card">
        <h3 className="text-sm font-medium text-muted-foreground mb-2">
          <Trans>Query History</Trans>
        </h3>
        {history.length === 0 ? (
          <p className="text-xs text-gray-500">
            <Trans>No history yet.</Trans>
          </p>
        ) : (
          <ul className="space-y-2">
            {history.map((q) => (
              <li key={q}>
                <button
                  type="button"
                  className="w-full text-left text-xs text-gray-400 hover:text-white truncate p-2 rounded bg-deep-night/50 hover:bg-deep-night"
                  onClick={() => setSql(q)}
                >
                  {q}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex-1 p-4 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <textarea
            value={sql}
            onChange={(e) => setSql(e.target.value)}
            className="font-mono text-sm bg-deep-night/50 min-h-[100px] w-full p-2 rounded border border-gray-700/40"
            placeholder={t`Write a SQL query...`}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={runQuery} disabled={isLoading}>
            <Play className="h-4 w-4 mr-2" /> <Trans>Run Query</Trans>
          </Button>
          <Button size="sm" variant="outline" onClick={exportCsv} disabled={results.length === 0}>
            <Download className="h-4 w-4 mr-2" /> <Trans>Export CSV</Trans>
          </Button>
        </div>
        <div className="flex-1 overflow-auto bg-card border border-gray-700/40 rounded-lg">
          {results.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th key={c} className="text-left p-2">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map((row) => (
                  <tr key={JSON.stringify(row)}>
                    {columns.map((c) => (
                      <td key={c} className="p-2">
                        {String(row[c] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
              <Trans>Write a SQL query to explore your data. No ETL needed.</Trans>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
