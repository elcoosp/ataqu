import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@ataqu/api-client';
import { useIdempotency } from '@ataqu/shared-hooks';
import { handleApiError } from '@ataqu/shared-utils';
import { Button, Input } from '@ataqu/ui';
import { Trans, t } from '@lingui/react/macro';
import { Plus, ChevronUp, ChevronDown, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { RelationCell } from './relation-cell';
import { cn } from '@ataqu/ui';

// Types
interface Row {
  id: string;
  values: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

interface DatabaseGridProps {
  databaseId: string;
  columns: Array<{ name: string; type: 'text' | 'number' | 'date' | 'select' | 'relation' }>;
  onAddRow?: () => void;
}

export function DatabaseGrid({ databaseId, columns, onAddRow }: DatabaseGridProps) {
  const queryClient = useQueryClient();
  const { getKey } = useIdempotency();
  const [editingCell, setEditingCell] = useState<{ rowId: string; col: string } | null>(null);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterText, setFilterText] = useState('');

  // Fetch rows
  const { data: rows = [], refetch, error } = useQuery<Row[]>({
    queryKey: ['database-rows', databaseId],
    queryFn: () => api.get(`/databases/${databaseId}/rows`),
  });

  if (error) toast.error(handleApiError(error));

  // Create row mutation
  const createRowMutation = useMutation({
    mutationFn: (data: { values: Record<string, any> }) =>
      api.post<Row>(`/databases/${databaseId}/rows`, data, {
        headers: { 'Idempotency-Key': getKey() },
      }),
    onSuccess: () => {
      toast.success(<Trans>Row added.</Trans>);
      refetch();
      onAddRow?.();
    },
    onError: (err) => toast.error(handleApiError(err)),
  });

  // Update row mutation
  const updateRowMutation = useMutation({
    mutationFn: (data: { rowId: string; values: Record<string, any> }) =>
      api.patch<Row>(`/databases/${databaseId}/rows/${data.rowId}`, data.values, {
        headers: { 'Idempotency-Key': getKey() },
      }),
    onSuccess: () => {
      refetch();
    },
    onError: (err) => toast.error(handleApiError(err)),
  });

  const handleAddRow = () => {
    const emptyValues: Record<string, any> = {};
    columns.forEach(col => {
      emptyValues[col.name] = col.type === 'number' ? 0 : '';
    });
    createRowMutation.mutate({ values: emptyValues });
  };

  const handleCellChange = (rowId: string, col: string, value: any) => {
    setEditingCell(null);
    updateRowMutation.mutate({ rowId, values: { [col]: value } });
  };

  const handleCellEdit = (rowId: string, col: string) => {
    setEditingCell({ rowId, col });
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filter and sort rows
  const filteredRows = rows.filter((row) => {
    if (!filterText) return true;
    return Object.values(row.values).some((val) =>
      String(val).toLowerCase().includes(filterText.toLowerCase())
    );
  });

  const sortedRows = [...filteredRows];
  if (sortField) {
    sortedRows.sort((a, b) => {
      const aVal = a.values[sortField] ?? '';
      const bVal = b.values[sortField] ?? '';
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  const renderCell = (row: Row, col: { name: string; type: string }) => {
    const value = row.values?.[col.name] ?? '';
    const isEditing = editingCell?.rowId === row.id && editingCell?.col === col.name;

    if (isEditing) {
      // Render input for editing
      if (col.type === 'relation') {
        // Relation editing uses the RelationCell
        return (
          <RelationCell
            value={value ? { app: 'cinq', entityId: value, label: value } : null}
            onSelect={(v) => handleCellChange(row.id, col.name, v ? v.entityId : null)}
            app="cinq"
            placeholder={t`Search…`}
          />
        );
      }
      return (
        <Input
          type={col.type === 'number' ? 'number' : 'text'}
          defaultValue={value}
          autoFocus
          onBlur={(e) => handleCellChange(row.id, col.name, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleCellChange(row.id, col.name, (e.target as HTMLInputElement).value);
            }
            if (e.key === 'Escape') {
              setEditingCell(null);
            }
          }}
          className="h-7 text-sm bg-background border-border"
        />
      );
    }

    // Display mode
    if (col.type === 'relation') {
      return (
        <RelationCell
          value={value ? { app: 'cinq', entityId: value, label: value } : null}
          onSelect={(v) => handleCellChange(row.id, col.name, v ? v.entityId : null)}
          app="cinq"
        />
      );
    }

    return (
      <div
        className="cursor-pointer hover:bg-accent p-1 rounded min-h-[2rem]"
        onClick={() => handleCellEdit(row.id, col.name)}
      >
        {col.type === 'number' ? Number(value).toLocaleString() : String(value)}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleAddRow} data-tour="new-row">
            <Plus className="h-4 w-4 mr-1" />
            <Trans>Add Row</Trans>
          </Button>
          <div className="relative">
            <Filter className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t`Filter rows…`}
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="pl-8 h-8 text-sm w-48"
            />
          </div>
        </div>
        <span className="text-xs text-muted-foreground">
          <Trans>{rows.length} rows</Trans>
        </span>
      </div>

      <div className="border border-border rounded overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.name}
                  className="px-3 py-2 text-left font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none"
                  onClick={() => handleSort(col.name)}
                >
                  <div className="flex items-center gap-1">
                    {col.name}
                    {sortField === col.name && (
                      sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => (
              <tr key={row.id} className="border-t border-border hover:bg-accent/5">
                {columns.map((col) => (
                  <td key={col.name} className="px-3 py-1 align-middle">
                    {renderCell(row, col)}
                  </td>
                ))}
              </tr>
            ))}
            {sortedRows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="text-center py-8 text-muted-foreground">
                  <Trans>No rows. Add one above.</Trans>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
