import { api } from "@ataqu/api-client";
import { Button } from "@ataqu/ui";
import { FileSpreadsheet, FileText, Image as ImageIcon } from "lucide-react";
import type React from "react";
import { toast } from "sonner";

interface ExportButtonsProps {
	dashboardId: string;
}

export const ExportButtons: React.FC<ExportButtonsProps> = ({
	dashboardId,
}) => {
	const handleExport = async (format: "pdf" | "csv" | "png") => {
		try {
			const blob = await api.get<Blob>(
				`/vista/dashboards/${dashboardId}/export`,
				{
					params: { format },
					responseType: "blob",
				},
			);
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `dashboard-${dashboardId}.${format}`;
			a.click();
			window.URL.revokeObjectURL(url);
			toast.success("Export ready.");
		} catch {
			toast.error("Export failed.");
		}
	};

	return (
		<div className="flex items-center gap-2">
			<Button variant="outline" size="sm" onClick={() => handleExport("pdf")}>
				<FileText className="h-4 w-4 mr-2" /> PDF
			</Button>
			<Button variant="outline" size="sm" onClick={() => handleExport("csv")}>
				<FileSpreadsheet className="h-4 w-4 mr-2" /> CSV
			</Button>
			<Button variant="outline" size="sm" onClick={() => handleExport("png")}>
				<ImageIcon className="h-4 w-4 mr-2" /> PNG
			</Button>
		</div>
	);
};
