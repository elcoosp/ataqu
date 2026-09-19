import { CopyButton } from "@ataqu/ui";

export function ExportButtons({ dashboardId }: { dashboardId: string }) {
	return (
		<CopyButton
			value={`${window.location.origin}/vista/dashboard/${dashboardId}`}
			label="Copy dashboard link"
		/>
	);
}
