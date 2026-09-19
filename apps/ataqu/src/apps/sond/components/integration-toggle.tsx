import { Badge } from "@ataqu/ui";
import { Switch } from "./ui/switch";

interface Props {
	label: string;
	enabled: boolean;
	onToggle: (enabled: boolean) => void;
	connectedBadge: string;
}

export function IntegrationToggle({
	label,
	enabled,
	onToggle,
	connectedBadge,
}: Props) {
	return (
		<div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
			<div className="flex items-center gap-3">
				<Switch checked={enabled} onCheckedChange={onToggle} />
				<span className="font-medium">{label}</span>
			</div>
			{enabled && <Badge variant="secondary">{connectedBadge}</Badge>}
		</div>
	);
}
