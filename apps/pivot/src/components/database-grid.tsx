import { useState } from 'react';
import { useListDatabaseRows, useCreateDatabaseRow, useUpdateDatabaseRow } from '@/api';
import { useIdempotency } from '@ataqu/shared-hooks';
import { Button } from '@ataqu/ui';
import { Trans } from '@lingui/react/macro';
import { Plus } from 'lucide-react';
import { RelationCell } from './relation-cell';

interface DatabaseGridProps {
  databaseId: string;
  columns: Array<{ name: string; type: 'text' | 'number' | 'date' | 'select' | 'relation' }>;
}

export function DatabaseGrid({ databaseId, columns }: DatabaseGridProps) {
  const [editingCell, setEditingCell] = useState<{ rowId: string; col: string } | null>(null);
  const { data: rows, refetch } = useListDatabaseRows(databaseId);
  const { mutate: createRow } = useCreateDatabaseRow();
  const { mutate: updateRow } = useUpdateDatabaseRow();
  const { getKey } = useIdempotency();

  const handleAddRow = () => {
    const newRow: any = { databaseId, values: {} };
    columns.forEach(col => newRow.values[col.name] = '');
    createRow(
      { data: newRow, headers: { 'Idempotency-Key': getKey() } },
      { onSuccess: () => refetch() }
    );
  };

  const handleCellChange = (rowId: string, col: string, value: any) => {
    updateRow(
      {
        id: rowId,
        data: { values: { [col]: value } },
        headers: { 'Idempotency-Key': getKey() },
      },
      { onSuccess: () => refetch() }
    );
  };

  const renderCell = (row: any, col: { name: string; type: string }) => {
    const value = row.values?.[col.name] ?? '';
    if (col.type === 'relation') {
      return (
        <RelationCell
          value={value ? { app: 'cinq', entityId: value, label: value } : undefined}
          onSelect={(v) => handleCellChange(row.id, col.name, v ? v.entityId : null)}
          app="cinq"
        />
      );
    }
    return (
      <input
        type={col.type === 'number' ? 'number' : 'text'}
        value={value}
        onChange={(e) => handleCellChange(row.id, col.name, e.target.value)}
        className="w-full bg-transparent border-none outline-none text-sm p-1"
      />
    );
  };

  return (
    <div className="border border-border rounded overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            {columns.map((col) => (
              <th key={col.name} className="px-3 py-2 text-left font-medium text-muted-foreground">
                {col.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows?.map((row: any) => (
            <tr key={row.id} className="border-t border-border">
              {columns.map((col) => (
                <td key={col.name} className="px-3 py-1">
                  {renderCell(row, col)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="p-2 border-t border-border">
        <Button variant="ghost" size="sm" onClick={handleAddRow} data-tour="new-row">
          <Plus className="h-4 w-4 mr-1" />
          <Trans>Add Row</Trans>
        </Button>
      </div>
    </div>
  );
}
