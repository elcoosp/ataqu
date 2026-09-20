import {
	type ColumnDef,
	type ColumnFiltersState,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import { ChevronDown, ChevronsUpDown, ChevronUp } from "lucide-react";
import React from "react";
import { cn } from "../lib/utils";
import { Button } from "./button";
import { Input } from "./input";
import { VirtualRows } from "./virtual-rows";

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
	searchPlaceholder = "Search...",
	pageSize,
	virtualize = false,
	rowHeight = 40,
	className,
}: DataTableProps<TData, TValue>) {
	const [sorting, setSorting] = React.useState<SortingState>([]);
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
		[],
	);
	const [globalFilter, setGlobalFilter] = React.useState("");

	const table = useReactTable({
		data,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: virtualize ? undefined : getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		state: {
			sorting,
			columnFilters,
			globalFilter,
		},
		onGlobalFilterChange: setGlobalFilter,
		initialState: pageSize ? { pagination: { pageSize } } : undefined,
	});

	const { rows } = table.getRowModel();

	const renderHeaders = () =>
		table.getHeaderGroups().map((headerGroup) => (
			<tr key={headerGroup.id}>
				{headerGroup.headers.map((header) => (
					<th
						key={header.id}
						className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
					>
						{header.isPlaceholder ? null : (
							<div
								className={cn(
									"flex items-center gap-1 cursor-pointer select-none",
									header.column.getCanSort() && "hover:text-white",
								)}
								onClick={header.column.getToggleSortingHandler()}
							>
								{flexRender(
									header.column.columnDef.header,
									header.getContext(),
								)}
								{{
									asc: <ChevronUp className="h-4 w-4" />,
									desc: <ChevronDown className="h-4 w-4" />,
								}[header.column.getIsSorted() as string] ??
									(header.column.getCanSort() && (
										<ChevronsUpDown className="h-4 w-4 opacity-50" />
									))}
							</div>
						)}
					</th>
				))}
			</tr>
		));

	const renderCells = (row: (typeof rows)[number] | undefined) =>
		row?.getVisibleCells()?.map((cell) => (
			<td key={cell.id} className="px-4 py-2 text-sm truncate">
				{flexRender(cell.column.columnDef.cell, cell.getContext())}
			</td>
		));

	const emptyRow = (
		<tr>
			<td
				colSpan={columns.length}
				className="text-center py-8 text-muted-foreground"
			>
				No results found.
			</td>
		</tr>
	);

	const rowClasses =
		"border-b border-border/40 hover:bg-white/5 transition-colors";

	return (
		<div className={cn("w-full", className)}>
			<div className="flex items-center justify-between py-4 gap-4 flex-wrap">
				{searchColumn && (
					<Input
						placeholder={searchPlaceholder}
						value={globalFilter}
						onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
							setGlobalFilter(e.target.value)
						}
						className="max-w-sm bg-deep-night/50 border-border/40 text-white placeholder-gray-400"
					/>
				)}
				{!virtualize && (
					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => table.previousPage()}
							disabled={!table.getCanPreviousPage()}
							className="border-border/40 text-muted-foreground hover:text-white"
						>
							Previous
						</Button>
						<span className="text-sm text-muted-foreground">
							Page {table.getState().pagination.pageIndex + 1} of{" "}
							{table.getPageCount()}
						</span>
						<Button
							variant="outline"
							size="sm"
							onClick={() => table.nextPage()}
							disabled={!table.getCanNextPage()}
							className="border-border/40 text-muted-foreground hover:text-white"
						>
							Next
						</Button>
					</div>
				)}
			</div>

			{virtualize ? (
				<VirtualRows
					count={rows.length}
					estimateSize={rowHeight}
					overscan={10}
					maxHeight={400}
					className="rounded-md border border-border/40"
				>
					{({ padTop, padBottom, items, measureElement }) => (
						<table className="w-full border-collapse">
							<thead className="sticky top-0 bg-deep-night/90 z-10">
								{renderHeaders()}
							</thead>
							<tbody>
								{rows.length === 0 ? (
									emptyRow
								) : (
									<>
										{padTop > 0 && (
											<tr
												style={{ height: `${padTop}px` }}
												aria-hidden="true"
											/>
										)}
										{items.map((virtualRow) => {
											const row = rows[virtualRow.index];
											return (
												<tr
													key={row?.id || `row-${virtualRow.index}`}
													data-index={virtualRow.index}
													ref={measureElement}
													className={rowClasses}
												>
													{renderCells(row)}
												</tr>
											);
										})}
										{padBottom > 0 && (
											<tr
												style={{ height: `${padBottom}px` }}
												aria-hidden="true"
											/>
										)}
									</>
								)}
							</tbody>
						</table>
					)}
				</VirtualRows>
			) : (
				<div className="rounded-md border border-border/40 overflow-auto">
					<table className="w-full border-collapse">
						<thead className="sticky top-0 bg-deep-night/90 z-10">
							{renderHeaders()}
						</thead>
						<tbody>
							{rows.length === 0
								? emptyRow
								: rows.map((row, index) => (
										<tr key={row?.id || `row-${index}`} className={rowClasses}>
											{renderCells(row)}
										</tr>
									))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
