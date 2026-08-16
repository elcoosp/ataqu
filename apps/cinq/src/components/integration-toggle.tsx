import { useToggleIntegration, type IntegrationStatus } from "@ataqu/api-client";
import type { UUID } from "@ataqu/types";
import { Badge, Button } from "@ataqu/ui";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { toast } from "sonner";

export function IntegrationToggle({
	dealId,
	targetApp,
	label,
}: {
	dealId: UUID;
	targetApp: "dial" | "spark";
	label: ReactNode;
}) {
	const queryClient = useQueryClient();
	const [enabled, setEnabled] = useState(false);

	const mutation = useToggleIntegration({
		onSuccess: (data: IntegrationStatus) => {
			setEnabled(data.enabled);
			queryClient.invalidateQueries({ queryKey: ["cinq", "deal", dealId] });
			toast.success(
				data.enabled
					? t`CINQ connected to ${targetApp}`
					: t`CINQ disconnected from ${targetApp}`,
			);
		},
		onError: () => {
			toast.error(t`Failed to toggle integration`);
			setEnabled(!enabled);
		},
	});

	const handleToggle = () => {
		const newValue = !enabled;
		setEnabled(newValue);
		mutation.mutate({ integration: targetApp, enabled: newValue });
	};

	return (
		<div className="flex items-center gap-2">
			<Button
				variant={enabled ? "default" : "outline"}
				size="sm"
				onClick={handleToggle}
				className="min-w-[100px]"
			>
				{enabled ? <Trans>Connected</Trans> : <Trans>Connect</Trans>}
			</Button>
			<span className="text-sm">{label}</span>
			{enabled && (
				<Badge variant="outline">
					<Trans>Connected to {targetApp}</Trans>
				</Badge>
			)}
		</div>
	);
}
