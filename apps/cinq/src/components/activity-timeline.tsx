import type { ActivityResponse } from "@ataqu/api-client";
import { listActivities } from "@ataqu/api-client";
import type { UUID } from "@ataqu/types";
import { Card, CardContent, Skeleton } from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useMemo } from "react";

export function ActivityTimeline({ dealId }: { dealId: UUID }) {
	const { data, isLoading } = useQuery({
		queryKey: ["cinq", "activities", "list"],
		queryFn: () => listActivities({ limit: 50 }),
	});

	const activities = useMemo(
		() => (data || []).filter((a: ActivityResponse) => a.deal_id === dealId),
		[data, dealId],
	);

	if (isLoading) {
		return <Skeleton className="h-32 w-full" />;
	}

	return (
		<div className="space-y-4">
			{activities.length === 0 ? (
				<p className="text-muted-foreground">
					<Trans>No activities yet</Trans>
				</p>
			) : (
				activities.map((a: ActivityResponse) => (
					<Card key={a.id}>
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
		</div>
	);
}
