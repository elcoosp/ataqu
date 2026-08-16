import type { ActivityResponse } from "@ataqu/api-client";
import { useGetActivity, useListActivities } from "@ataqu/api-client";
import type { UUID } from "@ataqu/types";
import {
	Bone,
	Card,
	CardContent,
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import { format } from "date-fns";
import { useMemo, useState } from "react";

function ActivityDetailDialog({
	activityId,
	onOpenChange,
}: {
	activityId: string;
	onOpenChange: (open: boolean) => void;
}) {
	const { data: activity, isLoading } = useGetActivity(activityId);

	return (
		<Dialog open onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						{isLoading ? "…" : (activity?.activity_type ?? "")}
					</DialogTitle>
				</DialogHeader>
				<Bone
					loading={isLoading}
					name="activity-detail"
					fallback={<div className="h-20 rounded" />}
				>
					{null}
				</Bone>
				{activity && (
					<div className="space-y-2 text-sm">
						<p>{activity.description}</p>
						{activity.scheduled_at && (
							<p className="text-muted-foreground">
								Scheduled: {format(new Date(activity.scheduled_at), "PPp")}
							</p>
						)}
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}

export function ActivityTimeline({ dealId }: { dealId: UUID }) {
	const [detailId, setDetailId] = useState<string | null>(null);
	const { data, isLoading } = useListActivities({ limit: 50 });

	const activities = useMemo(
		() => (data || []).filter((a: ActivityResponse) => a.deal_id === dealId),
		[data, dealId],
	);

	if (isLoading) {
		return (
			<Bone
				loading
				name="activities"
				fallback={<div className="h-32 w-full" />}
			>
				{null}
			</Bone>
		);
	}

	return (
		<div className="space-y-4">
			{activities.length === 0 ? (
				<p className="text-muted-foreground">
					<Trans>No activities yet</Trans>
				</p>
			) : (
				activities.map((a: ActivityResponse) => (
					<Card
						key={a.id}
						className="cursor-pointer hover:bg-accent/10"
						onClick={() => setDetailId(a.id)}
					>
						<CardContent className="p-4">
							<div className="flex justify-between">
								<span className="font-medium capitalize">
									{a.activity_type}
								</span>
								<span className="text-sm text-muted-foreground">
									{format(new Date(a.created_at), "PPp")}
								</span>
							</div>
							<p className="mt-1">{a.description}</p>
						</CardContent>
					</Card>
				))
			)}
			{detailId && (
				<ActivityDetailDialog
					activityId={detailId}
					onOpenChange={(open) => {
						if (!open) setDetailId(null);
					}}
				/>
			)}
		</div>
	);
}
