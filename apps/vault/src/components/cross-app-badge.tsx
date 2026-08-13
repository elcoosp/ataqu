import { api } from "@ataqu/api-client";
import type { UUID } from "@ataqu/types";
import { Badge } from "@ataqu/ui";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";

interface CrossAppRelation {
	id: string;
	app: string;
	deal_id?: number;
	url?: string;
}

export function CrossAppBadge({ entityId }: { entityId: UUID }) {
	const { data: relations } = useQuery({
		queryKey: ["cross-app", "relations", entityId],
		queryFn: () =>
			api.get<CrossAppRelation[]>("/api/v1/cross-app/relations", {
				params: { entityId },
			}),
		retry: false,
	});

	const cinqRelation = relations?.find(
		(relation) => relation.app === "cinq" || relation.app === "collab_crm",
	);

	if (!cinqRelation) return null;

	const href =
		cinqRelation.url ??
		(cinqRelation.deal_id ? `/crm/deals/${cinqRelation.deal_id}` : "/crm");

	return (
		<Badge
			variant="secondary"
			className="bg-blue-500/10 text-blue-500 border-blue-500/20"
		>
			<a
				href={href}
				target="_blank"
				rel="noreferrer noopener"
				className="hover:underline"
			>
				{cinqRelation.deal_id ? (
					t`Reserved for CINQ deal #${cinqRelation.deal_id}`
				) : (
					<Trans>Reserved for CINQ</Trans>
				)}
			</a>
		</Badge>
	);
}
