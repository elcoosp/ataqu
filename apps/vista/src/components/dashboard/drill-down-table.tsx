import React from 'react';

interface DrillDownTableProps {
  data: Record<string, unknown>[];
}

export const DrillDownTable: React.FC<DrillDownTableProps> = ({ data }) => {
  if (data.length === 0) return null;
  const firstRow = data[0] as Record<string, unknown>;
  const headers = Object.keys(firstRow);

  return (
    <table className="w-full text-sm">
      <thead>
        <tr>
          {headers.map((h) => (
            <th key={h} className="text-left p-2">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row) => (
          <tr key={JSON.stringify(row)}>
            {headers.map((h) => (
              <td key={h} className="p-2">
                {String(row[h] ?? '')}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};
