import React from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './button';
import { Input } from './input';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchColumn?: string;
  searchPlaceholder?: string;
  pageSize?: number;
  virtualize?: boolean;
  rowHeight?: number;
  className?: string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchColumn,
  searchPlaceholder = 'Search...',
  pageSize = 10,
  virtualize = false,
  rowHeight = 40,
  className,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = React.useState('');

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
  });

  const { rows } = table.getRowModel();

  const parentRef = React.useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 10,
    enabled: virtualize,
  });

  const renderRows = () => {
    if (virtualize) {
      return rowVirtualizer.getVirtualItems().map((virtualRow) => {
        const row = rows[virtualRow.index];
        return (
          <tr
            key={row?.id || `row-${virtualRow.index}`}
            className="border-b border-gray-700/40 hover:bg-white/5 transition-colors"
            style={{
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
              position: 'absolute',
              width: '100%',
            }}
          >
            {row?.getVisibleCells()?.map((cell) => (
              <td key={cell.id} className="px-4 py-2 text-sm truncate">
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
        );
      });
    }

    return rows.map((row, index) => (
      <tr key={row?.id || `row-${index}`} className="border-b border-gray-700/40 hover:bg-white/5 transition-colors">
        {row?.getVisibleCells()?.map((cell) => (
          <td key={cell.id} className="px-4 py-2 text-sm truncate">
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </td>
        ))}
      </tr>
    ));
  };

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between py-4 gap-4 flex-wrap">
        {searchColumn && (
          <Input
            placeholder={searchPlaceholder}
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="max-w-sm bg-deep-night/50 border-gray-700/40 text-white placeholder-gray-400"
          />
        )}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="border-gray-700/40 text-gray-400 hover:text-white"
          >
            Previous
          </Button>
          <span className="text-sm text-gray-400">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="border-gray-700/40 text-gray-400 hover:text-white"
          >
            Next
          </Button>
        </div>
      </div>

      <div
        ref={parentRef}
        className={cn(
          'rounded-md border border-gray-700/40 overflow-auto',
          virtualize && 'relative'
        )}
        style={virtualize ? { height: `${Math.min(rows.length * rowHeight, 400)}px` } : undefined}
      >
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-deep-night/90 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    {header.isPlaceholder ? null : (
                      <div
                        className={cn(
                          'flex items-center gap-1 cursor-pointer select-none',
                          header.column.getCanSort() && 'hover:text-white'
                        )}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{
                          asc: <ChevronUp className="h-4 w-4" />,
                          desc: <ChevronDown className="h-4 w-4" />,
                        }[header.column.getIsSorted() as string] ?? (
                          header.column.getCanSort() && <ChevronsUpDown className="h-4 w-4 opacity-50" />
                        )}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className={virtualize ? 'relative' : ''}>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-8 text-gray-400">
                  No results found.
                </td>
              </tr>
            ) : (
              renderRows()
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
