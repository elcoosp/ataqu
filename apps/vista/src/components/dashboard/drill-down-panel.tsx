import { Button } from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import { Download, X } from "lucide-react";
import type React from "react";
import { useDrillDownStore } from "../../hooks/use-drill-down-store";
import { DrillDownTable } from "./drill-down-table";

export const DrillDownPanel: React.FC = () => {
	const { isOpen, setOpen, loading, data, dimension, value } =
		useDrillDownStore();

	if (!isOpen) return null;

	const exportCsv = () => {
		if (data.length === 0) return;
		const firstRow = data[0] as Record<string, unknown>;
		const headers = Object.keys(firstRow);
		const csv = [
			headers.join(","),
			...data.map((row) =>
				headers.map((h) => JSON.stringify(row[h] ?? "")).join(","),
			),
		].join("\n");
		const blob = new Blob([csv], { type: "text/csv" });
		const url = window.URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `drill-down-${dimension}-${value}.csv`;
		a.click();
		window.URL.revokeObjectURL(url);
	};

	const handleClose = () => setOpen(false);

	return (
		<div
			className="fixed inset-0 z-50 flex justify-end bg-black/80"
			onClick={handleClose}
			onKeyDown={(e: React.KeyboardEvent) => {
				if (e.key === "Escape") handleClose();
			}}
		>
			<div
				className="w-[350px] h-full ataqu-glass p-6 flex flex-col gap-4"
				onClick={(e: React.MouseEvent) => e.stopPropagation()}
				onKeyDown={(e: React.KeyboardEvent) => e.stopPropagation()}
			>
				<div className="flex justify-between items-center">
					<h2 className="text-lg font-semibold">
						{value} <Trans>Details</Trans>
					</h2>
					<Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
						<X className="h-4 w-4" />
					</Button>
				</div>
				<p className="text-sm text-muted-foreground">
					<Trans>
						Showing raw data for {dimension}: {value}
					</Trans>
				</p>
				<div className="flex justify-end">
					<Button
						size="sm"
						variant="outline"
						onClick={exportCsv}
						disabled={data.length === 0}
					>
						<Download className="h-4 w-4 mr-2" /> <Trans>Export CSV</Trans>
					</Button>
				</div>
				<div className="flex-1 overflow-auto">
					{loading ? (
						<div className="animate-pulse space-y-2">
							<div className="h-8 bg-gray-700/40 rounded"></div>
							<div className="h-8 bg-gray-700/40 rounded"></div>
						</div>
					) : data.length > 0 ? (
						<DrillDownTable data={data} />
					) : (
						<div className="text-center py-8 text-muted-foreground text-sm">
							<Trans>No data found for this selection.</Trans>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};
