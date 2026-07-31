'use client';

import * as React from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  SortingState,
} from '@tanstack/react-table';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/Table';
import { cn } from '@/lib/utils';
import { LeadDetail } from './LeadDetail';

interface Lead {
  id: string;
  signal: {
    author: string | null;
    source_url: string | null;
    mapped_app: string | null;
    raw_text: string | null;
    thread_context: string | null;
  };
  direct_quote: string | null;
  overall_lead_score: number | null;
  urgency: number | null;
  buying_intent: number | null;
  feature_gap: string | null;
  competitor: string | null;
  created_at: Date | null;
  // Additional fields for modal
  buyer_segment: string | null;
  workflow: string | null;
  current_workaround: string | null;
  root_cause: string | null;
  pricing_complaint: string | null;
  ux_friction: string | null;
  feature_impact: number | null;
  frequency: number | null;
}

interface LeadsTableProps {
  leads: Lead[];
}

export function LeadsTable({ leads }: LeadsTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = React.useState('');
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [selectedLead, setSelectedLead] = React.useState<Lead | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);

  const columns = React.useMemo<ColumnDef<Lead>[]>(
    () => [
      {
        accessorKey: 'signal.author',
        header: 'Author',
        cell: (info) => info.getValue() || 'Anonymous',
        size: 120,
      },
      {
        accessorKey: 'competitor',
        header: 'Competitor',
        cell: (info) => info.getValue() || 'N/A',
        size: 130,
      },
      {
        accessorKey: 'signal.mapped_app',
        header: 'App',
        cell: (info) => info.getValue() || 'N/A',
        size: 80,
      },
      {
        accessorKey: 'direct_quote',
        header: 'Quote',
        cell: (info) => {
          const text = info.getValue() as string;
          return text ? text.slice(0, 120) + (text.length > 120 ? '…' : '') : 'No quote';
        },
        size: 350,
      },
      {
        accessorKey: 'overall_lead_score',
        header: 'Score',
        cell: (info) => {
          const score = info.getValue() as number | null;
          if (score === null) return '-';
          const color = score >= 7 ? 'text-green-600' : score >= 4 ? 'text-yellow-600' : 'text-red-600';
          return <span className={cn('font-semibold', color)}>{score.toFixed(1)}</span>;
        },
        size: 80,
      },
      {
        accessorKey: 'urgency',
        header: 'Urgency',
        cell: (info) => {
          const val = info.getValue() as number | null;
          if (val === null) return '-';
          const color = val >= 7 ? 'text-red-600' : val >= 4 ? 'text-yellow-600' : 'text-green-600';
          return <span className={color}>{val}</span>;
        },
        size: 70,
      },
      {
        accessorKey: 'buying_intent',
        header: 'Intent',
        cell: (info) => {
          const val = info.getValue() as number | null;
          if (val === null) return '-';
          const color = val >= 7 ? 'text-green-600' : val >= 4 ? 'text-yellow-600' : 'text-red-600';
          return <span className={color}>{val}</span>;
        },
        size: 70,
      },
      {
        accessorKey: 'feature_gap',
        header: 'Feature Gap',
        cell: (info) => {
          const text = info.getValue() as string | null;
          return text ? text.slice(0, 60) + (text.length > 60 ? '…' : '') : 'N/A';
        },
        size: 200,
      },
      {
        id: 'actions',
        header: 'Action',
        cell: ({ row }) => {
          const lead = row.original;
          return (
            <button
              onClick={() => {
                setSelectedLead(lead);
                setModalOpen(true);
              }}
              className="text-blue-600 hover:underline text-sm"
            >
              View
            </button>
          );
        },
        size: 80,
      },
    ],
    []
  );

  const table = useReactTable({
    data: leads,
    columns,
    state: {
      sorting,
      globalFilter,
      pagination,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: 'includesString',
  });

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <input
            type="text"
            value={globalFilter || ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search leads..."
            className="px-3 py-2 border border-gray-300 rounded-md text-sm flex-1 max-w-sm dark:border-gray-700 dark:bg-gray-800"
          />
          <div className="text-sm text-gray-500">
            Showing {table.getRowModel().rows.length} of {leads.length}
          </div>
        </div>

        <div className="border rounded-md overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} style={{ width: header.column.getSize() }}>
                      {header.isPlaceholder ? null : (
                        <div
                          className={cn(
                            'flex items-center gap-1 cursor-pointer select-none',
                            header.column.getCanSort() && 'hover:text-foreground'
                          )}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {{
                            asc: ' ↑',
                            desc: ' ↓',
                          }[header.column.getIsSorted() as string] ?? null}
                        </div>
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center text-gray-500">
                    No leads found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              className="px-3 py-1 border rounded text-sm disabled:opacity-50"
            >
              First
            </button>
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="px-3 py-1 border rounded text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </span>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="px-3 py-1 border rounded text-sm disabled:opacity-50"
            >
              Next
            </button>
            <button
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              className="px-3 py-1 border rounded text-sm disabled:opacity-50"
            >
              Last
            </button>
          </div>
          <select
            value={table.getState().pagination.pageSize}
            onChange={(e) => {
              table.setPageSize(Number(e.target.value));
            }}
            className="px-2 py-1 border rounded text-sm dark:border-gray-700 dark:bg-gray-800"
          >
            {[5, 10, 20, 50].map((size) => (
              <option key={size} value={size}>
                Show {size}
              </option>
            ))}
          </select>
        </div>
      </div>

      <LeadDetail lead={selectedLead} open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}
