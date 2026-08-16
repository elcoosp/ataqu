import { useGetChannel, useUpdateChannel } from "@ataqu/api-client";
import { handleApiError } from "@ataqu/shared-utils";
import { Badge, Button, Input, Skeleton } from "@ataqu/ui";
import { t } from "@lingui/core/macro";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { DollarSign, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { getCinqContext } from "@/api/cinq-context";

interface ContextSidebarProps {
	channelId: string;
}

export function ContextSidebar({ channelId }: ContextSidebarProps) {
	const { data: channel, isLoading: channelLoading } = useGetChannel(channelId);
	const updateChannel = useUpdateChannel({
		onSuccess: () => toast.success(t`Channel renamed`),
		onError: (err) => toast.error(handleApiError(err)),
	});
	const [editingName, setEditingName] = useState(false);
	const [name, setName] = useState("");

	const { data: cinqContext } = useQuery({
		queryKey: ["cinq-context", channelId],
		queryFn: () => getCinqContext(channelId),
		enabled: !!channelId,
	});

	if (channelLoading) {
		return (
			<div className="p-4 space-y-4">
				<Skeleton className="h-8 w-full" />
				<Skeleton className="h-4 w-3/4" />
			</div>
		);
	}

	if (!channel) return null;

	const startEdit = () => {
		setName(channel.name);
		setEditingName(true);
	};

	const saveName = () => {
		updateChannel.mutate({
			id: channel.id,
			data: { name },
			version: channel.version,
		});
		setEditingName(false);
	};

	return (
		<div className="p-4 border-l border-border h-full bg-card/30">
			<h3 className="text-sm font-semibold text-foreground mb-4">{t`Channel Info`}</h3>
			<div className="space-y-2 text-sm text-muted-foreground">
				<div className="flex items-center gap-2">
					<span className="font-medium">{t`Name:`}</span>
					{editingName ? (
						<>
							<Input
								className="h-7 flex-1"
								value={name}
								onChange={(e) => setName(e.target.value)}
								autoFocus
							/>
							<Button
								size="sm"
								className="h-7"
								onClick={saveName}
								disabled={updateChannel.isPending}
							>
								{t`Save`}
							</Button>
						</>
					) : (
						<>
							<span>{channel.name}</span>
							<Button
								size="sm"
								variant="ghost"
								className="h-7 px-2"
								onClick={startEdit}
							>
								{t`Edit`}
							</Button>
						</>
					)}
				</div>
				<p>
					<span className="font-medium">{t`Type:`}</span> {channel.channel_type}
				</p>
				<p>
					<span className="font-medium">{t`Created:`}</span>{" "}
					{new Date(channel.created_at).toLocaleDateString()}
				</p>
			</div>

			{cinqContext && (
				<div className="mt-4 p-3 bg-primary/10 rounded-md border border-primary/20">
					<Badge variant="default" className="mb-2">
						Linked to CINQ
					</Badge>
					<Link to={"/dashboard"} className="block text-sm hover:underline">
						<div className="flex items-center gap-2">
							<DollarSign className="h-4 w-4" />
							<span className="font-medium">{cinqContext.name}</span>
						</div>
						<div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
							<span>Amount: ${cinqContext.amount}</span>
							<span>·</span>
							<span>Stage: {cinqContext.stage}</span>
						</div>
						<div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
							<User className="h-3 w-3" />
							<span>{cinqContext.contact_name}</span>
							<span>·</span>
							<span>{cinqContext.contact_email}</span>
						</div>
					</Link>
				</div>
			)}
		</div>
	);
}
