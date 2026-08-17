import type { DatabaseRow } from "@ataqu/api-client";
import {
	useCreateDatabaseRow,
	useGetDatabaseRows,
	useUpdateDatabaseRow,
} from "@ataqu/api-client";

import { handleApiError } from "@ataqu/shared-utils";
import { Button, ExpandingSearch, Input, Pagination } from "@ataqu/ui";
import { i18n } from "@lingui/core";
import { Trans } from "@lingui/react/macro";
import { ChevronDown, ChevronUp, Filter, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { RelationCell } from "./relation-cell";

interface DatabaseGridProps {
	databaseId: string;
	columns: Array<{
		name: string;
		type: "text" | "number" | "date" | "select" | "relation";
	}>;
	onAddRow?: () => void;
}

export function DatabaseGrid({
	databaseId,
	columns,
	onAddRow,
}: DatabaseGridProps) {
	const [editingCell, setEditingCell] = useState<{
		rowId: string;
		col: string;
	} | null>(null);
	const [sortField, setSortField] = useState<string | null>(null);
	const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
	const [filterText, setFilterText] = useState("");
	const [page, setPage] = useState(1);
	const PAGE_SIZE = 10;

	const { data: rows = [], refetch, error } = useGetDatabaseRows(databaseId);

	if (error) toast.error(handleApiError(error));

	const createRowMutation = useCreateDatabaseRow(databaseId, {
		onSuccess: () => {
			toast.success(<Trans>Row added.</Trans>);
			refetch();
			onAddRow?.();
		},
		onError: (err) => toast.error(handleApiError(err)),
	});

	const updateRowMutation = useUpdateDatabaseRow(databaseId, {
		onSuccess: () => {
			refetch();
		},
		onError: (err) => toast.error(handleApiError(err)),
	});

	const handleAddRow = () => {
		const emptyValues: Record<string, any> = {};
		columns.forEach((col) => {
			emptyValues[col.name] = col.type === "number" ? 0 : "";
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
			setSortDirection(sortDirection === "asc" ? "desc" : "asc");
		} else {
			setSortField(field);
			setSortDirection("asc");
		}
	};

	const filteredRows = rows.filter((row) => {
		if (!filterText) return true;
		return Object.values(row.data).some((val) =>
			String(val).toLowerCase().includes(filterText.toLowerCase()),
		);
	});

	const sortedRows = [...filteredRows];
	if (sortField) {
		sortedRows.sort((a, b) => {
			const aVal = a.data[sortField] ?? "";
			const bVal = b.data[sortField] ?? "";
			if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
			if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
			return 0;
		});
	}

	const pageRows = sortedRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
	const pageCount = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));

	const renderCell = (
		row: DatabaseRow,
		col: { name: string; type: string },
	) => {
		const value = row.data?.[col.name] ?? "";
		const isEditing =
			editingCell?.rowId === row.id && editingCell?.col === col.name;

		if (isEditing) {
			if (col.type === "relation") {
				return (
					<RelationCell
						value={
							value
								? { app: "cinq", entityId: String(value), label: String(value) }
								: null
						}
						onSelect={(v) =>
							handleCellChange(row.id, col.name, v ? v.entityId : null)
						}
						app="cinq"
						placeholder={i18n._("Search…")}
					/>
				);
			}
			return (
				<Input
					type={col.type === "number" ? "number" : "text"}
					defaultValue={value as string}
					autoFocus
					onBlur={(e: React.FocusEvent<HTMLInputElement>) =>
						handleCellChange(row.id, col.name, e.target.value)
					}
					onKeyDown={(e: React.KeyboardEvent) => {
						if (e.key === "Enter") {
							handleCellChange(
								row.id,
								col.name,
								(e.target as HTMLInputElement).value,
							);
						}
						if (e.key === "Escape") {
							setEditingCell(null);
						}
					}}
					className="h-7 text-sm bg-background border-border"
				/>
			);
		}

		if (col.type === "relation") {
			return (
				<RelationCell
					value={
						value
							? { app: "cinq", entityId: String(value), label: String(value) }
							: null
					}
					onSelect={(v) =>
						handleCellChange(row.id, col.name, v ? v.entityId : null)
					}
					app="cinq"
					placeholder={i18n._("Search…")}
				/>
			);
		}

		return (
			<div
				className="cursor-pointer hover:bg-accent p-1 rounded min-h-[2rem]"
				onClick={() => handleCellEdit(row.id, col.name)}
			>
				{col.type === "number" ? Number(value).toLocaleString() : String(value)}
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
						<ExpandingSearch
							value={filterText}
							onChange={setFilterText}
							placeholder={i18n._("Filter rows…")}
							className="relative flex-1 max-w-xs"
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
										{sortField === col.name &&
											(sortDirection === "asc" ? (
												<ChevronUp className="h-3 w-3" />
											) : (
												<ChevronDown className="h-3 w-3" />
											))}
									</div>
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{pageRows.map((row) => (
							<tr
								key={row.id}
								className="border-t border-border hover:bg-accent/5"
							>
								{columns.map((col) => (
									<td key={col.name} className="px-3 py-1 align-middle">
										{renderCell(row, col)}
									</td>
								))}
							</tr>
						))}
						{pageRows.length === 0 && (
							<tr>
								<td
									colSpan={columns.length}
									className="text-center py-8 text-muted-foreground"
								>
									<Trans>No rows. Add one above.</Trans>
								</td>
							</tr>
						)}
					</tbody>
					</table>
					{pageCount > 1 && (
						<div className="flex justify-center p-3">
							<Pagination
								count={pageCount}
								page={page}
								onPageChange={setPage}
							/>
						</div>
					)}
					</div>
					</div>
					);
					}
